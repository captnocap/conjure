import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { type P, at, belly, hairdo, mawashi, paint, pick, pickSkin, reach, rig, sheen, sizes } from './pose';

const APRONS = {
  navy: 'Navy cotton, the stable colour.',
  black: 'Plain black, practical.',
  brown: 'Brown canvas, stiff with old wax.',
  green: 'Dark bottle green.',
  maroon: 'Deep maroon.',
} as const;
const APRON_COLOUR: Record<keyof typeof APRONS, string> = { navy: '#1f2a44', black: '#1c1c1f', brown: '#5a4130', green: '#24402f', maroon: '#55222a' };

/** A tapered tube along a curve: a lock of hair, thick at the root and thin at the tip. */
function strand(points: THREE.Vector3[], r0: number, r1: number, flatten = 1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segments = 28, radial = 12;
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const r = mix(r0, r1, Math.pow(t, 0.8));
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const cx = Math.cos(v) * r, cy = Math.sin(v) * r * flatten;
      positions.push(p.x + n.x * cx + b.x * cy, p.y + n.y * cx + b.y * cy, p.z + n.z * cx + b.z * cy);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, c = a + radial + 1;
      indices.push(a, c, a + 1, c, c + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A wide boxwood comb: a spine with a row of teeth, its width across the palm and its teeth pointing forward. */
function comb(width: number, material: THREE.Material) {
  const group = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.BoxGeometry(width, 0.008, 0.026), material);
  spine.position.z = -0.006;
  const count = Math.round(width / 0.009);
  const teeth = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0035, 0.006, 0.034), material, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.makeTranslation(-width / 2 + (i + 0.5) * (width / count), 0, 0.022);
    teeth.setMatrixAt(i, m);
  }
  teeth.instanceMatrix.needsUpdate = true;
  spine.castShadow = teeth.castShadow = true;
  group.add(spine, teeth);
  return group;
}

export default defineThing({
  questions: {
    knot: choice('How far along is the topknot?', {
      loose: 'Not begun: the long oiled hair hangs loose down his back and the comb is drawing it straight.',
      gathered: 'Halfway: all the hair pulled straight up in one fist above his head while the wide comb smooths it.',
      tied: 'Tied: a short tail bound at the crown with white paper cord, being folded forward into a knot.',
      finished: 'Finished: the formal ginkgo-leaf fan sits perfect on his crown, and the hairdresser steps back to look.',
    }),
    dress: choice('What is the wrestler wearing?', {
      mawashi: 'Only his practice belt: bare shoulders, straight from training.',
      yukata: 'A printed cotton yukata with the stable\'s pattern, tied with a sash.',
      cape: 'A white cloth tied round his neck like a barber\'s cape, to keep the oil off.',
    }),
    seat: choice('What is he sitting on?', {
      low: 'A low wooden stool, knees up near his belly.',
      stool: 'An ordinary round wooden stool.',
      crate: 'An upturned plastic beer crate.',
    }),
    wrestler: choice('What is the seated wrestler doing?', {
      stoic: 'Staring straight ahead, hands on his knees, utterly still.',
      drowsy: 'Nodding off, chin dropping, hands slack on his knees.',
      phone: 'Looking down at a phone held in both hands, ignoring it all.',
    }),
    apron: choice('What colour is the hairdresser\'s apron?', APRONS),
    kit: choice('Where are the hairdresser\'s tools?', {
      table: 'On a small side table: a tin of wax, a folded cloth and a couple of combs.',
      box: 'In his own wooden tool box, a drawer pulled out and combs laid in a row on the lid.',
      floor: 'Laid out on a cloth on the floor beside the stool.',
    }),
    mirror: noul('Is there a hand mirror among the tools (held up behind his head once the knot is finished)?'),
    floor: choice('What is under the stool?', {
      tatami: 'A worn tatami mat.',
      newspaper: 'Sheets of newspaper spread out to catch the oil and the stray hairs.',
      boards: 'Bare wooden floorboards.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    // ---- the seated wrestler
    const H = mix(1.8, 1.9, random());
    const skin = pickSkin(random);
    const yukata = a.dress === 'yukata';
    const yukataTex = yukata
      ? paint(256, 256, (c) => {
        c.fillStyle = '#e9edf0';
        c.fillRect(0, 0, 256, 256);
        c.strokeStyle = '#2b3f6e';
        c.lineWidth = 7;
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
            c.beginPath();
            c.arc(cx, cy, 15, 0, Math.PI * 2);
            c.stroke();
            c.fillStyle = '#2b3f6e';
            c.fillRect(cx - 3, cy - 30, 6, 10);
          }
      })
      : null;
    if (yukataTex) { yukataTex.wrapS = yukataTex.wrapT = THREE.RepeatWrapping; yukataTex.repeat.set(2, 2); }
    const robe = '#e9edf0';
    const W = figure(s, {
      height: H, build: 'heavy', style: 'doll', hair: 'short', hairColor: '#15110f', skin,
      top: yukata ? robe : skin, bottom: yukata ? robe : skin, shoes: skin, sleeves: yukata ? 'long' : 'short', pose: 'sitting', gaze: 'ahead',
    });
    s.root.add(W.root);
    if (yukataTex) {
      const tinted = s.material(robe).color.getHex();
      W.root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        const m = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mesh.isMesh && m?.color?.getHex() === tinted) { m.map = yukataTex; m.color.set('#ffffff'); m.needsUpdate = true; }
      });
    }
    const bellyMat = yukata ? new THREE.MeshStandardMaterial({ map: yukataTex, roughness: 0.8 }) : s.material(skin, { roughness: 0.45 });
    belly(W, H, bellyMat, 0.95);
    if (!yukata) mawashi(s, W, H, 'heavy', pick(random, ['#1b1b1e', '#1e2a4a', '#5d6244']));
    if (!yukata && mood.energy > 0.55) sheen(s, W, skin, 0.3);
    const { limb, headR, hipW, pelvisL } = sizes(H, 'heavy');
    if (yukata) {
      // A dark sash below the belly with a flat bow at the back.
      const sash = s.material('#22304f', { roughness: 0.8 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28), sash);
      band.scale.set(hipW * 1.62, pelvisL * 0.9, limb * 2.3);
      band.position.set(0, pelvisL * 0.3, limb * 0.25);
      const bow = new THREE.Mesh(new THREE.BoxGeometry(hipW * 1.3, pelvisL * 0.8, limb * 0.5), sash);
      bow.position.set(0, pelvisL * 0.3, -limb * 2.35);
      band.castShadow = bow.castShadow = true;
      W.pelvis.add(band, bow);
    }

    const legs = { low: { forward: 110, knee: 122, out: 16 }, stool: { forward: 90, knee: 90, out: 11 }, crate: { forward: 99, knee: 104, out: 14 } }[a.seat];
    const pose = rig(W);
    for (const side of ['left', 'right'] as const) pose.leg(side, { ...legs, foot: 'flat' });
    const mind = a.wrestler;
    pose.bow(mind === 'phone' ? 14 : mind === 'drowsy' ? 8 : 0);
    pose.look(mind === 'phone' ? 36 : mind === 'drowsy' ? 26 : -2, 0, mind === 'drowsy' ? 9 : 0);
    W.settle();
    W.root.updateMatrixWorld(true);
    const kneeL = at(s, W.joints.knees.left), kneeR = at(s, W.joints.knees.right);
    if (mind === 'phone') {
      const hold = kneeL.clone().lerp(kneeR, 0.5).add(new THREE.Vector3(0, 0.16, -0.06));
      reach(W, 'left', hold.clone().add(new THREE.Vector3(0.045, 0, 0)), -0.7, 0.6);
      reach(W, 'right', hold.clone().add(new THREE.Vector3(-0.045, 0, 0)), 0.7, 0.6);
      const phone = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.15), s.material('#1d1f24', { roughness: 0.3 }));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.135), new THREE.MeshStandardMaterial({ color: '#cfe3ff', emissive: '#9cc4ff', emissiveIntensity: 0.6 }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.0045;
      body.castShadow = true;
      phone.add(body, screen);
      phone.position.copy(hold).add(new THREE.Vector3(0, 0.02, 0.02));
      phone.rotation.x = 0.55;
      s.root.add(phone);
    } else {
      const lift = new THREE.Vector3(0, limb * 0.9, 0.02);
      reach(W, 'left', kneeL.clone().add(lift), -0.5, 0.6);
      reach(W, 'right', kneeR.clone().add(lift), 0.5, 0.6);
    }
    W.root.updateMatrixWorld(true);

    // ---- a barber's cape: white cloth from the collar over the shoulders, belly and arms, down to the lap
    if (a.dress === 'cape') {
      const neckAt = at(s, W.joints.neck);
      const shoulderSpan = Math.abs(at(s, W.joints.shoulders.left).x - at(s, W.joints.shoulders.right).x) / 2;
      const R = shoulderSpan + limb * 0.85, rNeck = limb * 1.25, drop = H * 0.2;
      const folds = 7 + Math.floor(random() * 4), phase = random() * 6.28;
      const capeGeo = new ParametricGeometry((u, v, target) => {
        const phi = u * Math.PI * 2;
        let r: number, y: number, t = 0;
        if (v < 0.25) {
          const k = v / 0.25;
          r = rNeck + (R - rNeck) * Math.sin(k * Math.PI / 2);
          y = -H * 0.075 * (1 - Math.cos(k * Math.PI / 2));
        } else {
          t = (v - 0.25) / 0.75;
          r = R * (1 + 0.08 * t);
          y = -H * 0.075 - drop * t;
        }
        r *= 1 + t * (0.05 * Math.sin(phi * folds + phase) + 0.025 * Math.sin(phi * 17 + phase * 2));
        const front = Math.max(0, Math.sin(phi));
        target.set(Math.cos(phi) * r, y - t * t * 0.03 * Math.sin(phi * 3 + phase), Math.sin(phi) * r * 0.68 + front * Math.min(1, t * 2) * H * 0.05);
      }, 48, 16);
      const cape = s.mesh(capeGeo, s.material('#f3f1eb', { roughness: 0.9, side: THREE.DoubleSide }), [neckAt.x, neckAt.y + H * 0.012, neckAt.z + limb * 0.3]);
      void cape;
      const collar = s.ring(rNeck * 1.02, limb * 0.18, [neckAt.x, neckAt.y + H * 0.014, neckAt.z + limb * 0.3], s.material('#e5e1d6', { roughness: 0.8 }));
      collar.rotation.x = Math.PI / 2;
    }

    // ---- the seat, under the hips
    const hips = at(s, W.pelvis);
    const seatTop = W.hipHeight - limb * 1.05;
    const wood = s.material('#a5794c', { roughness: 0.7 });
    if (a.seat === 'low' || a.seat === 'stool') {
      const round = a.seat === 'stool';
      const top = round
        ? s.cylinder(0.19, 0.19, 0.04, [hips.x, seatTop - 0.02, hips.z], wood, 24)
        : s.box([0.4, 0.04, 0.32], [hips.x, seatTop - 0.02, hips.z], wood);
      void top;
      const legsN = round ? 3 : 4;
      for (let i = 0; i < legsN; i++) {
        const ang = (i / legsN) * Math.PI * 2 + (round ? 0.5 : Math.PI / 4);
        const rTop = round ? 0.13 : 0.15, rFoot = round ? 0.19 : 0.2;
        s.rod([hips.x + Math.cos(ang) * rFoot, 0, hips.z + Math.sin(ang) * rFoot], [hips.x + Math.cos(ang) * rTop, seatTop - 0.03, hips.z + Math.sin(ang) * rTop], 0.018, wood);
      }
      if (round) s.ring(0.155, 0.009, [hips.x, seatTop * 0.38, hips.z], wood).rotation.x = Math.PI / 2;
    } else {
      const colour = pick(random, ['#d8a520', '#b5322a', '#2f5f9e']);
      const grid = paint(128, 128, (c) => {
        c.fillStyle = colour;
        c.fillRect(0, 0, 128, 128);
        c.fillStyle = 'rgba(0,0,0,0.45)';
        for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) c.fillRect(8 + x * 30, 22 + y * 34, 20, 22);
      });
      const crate = s.box([0.46, seatTop, 0.32], [hips.x, seatTop / 2, hips.z], new THREE.MeshStandardMaterial({ map: grid, roughness: 0.55 }));
      crate.rotation.y = (random() - 0.5) * 0.15;
    }

    // ---- the hair, by stage
    W.root.updateMatrixWorld(true);
    const head = at(s, W.head);
    const crown = head.clone().add(new THREE.Vector3(0, headR * 1.05, -headR * 0.15));
    const oiled = s.material('#15110f', { roughness: 0.28 });
    const stage = a.knot;
    if (stage === 'finished') hairdo(s, W, H, 'oicho');
    else if (stage === 'tied') hairdo(s, W, H, 'chonmage');
    else hairdo(s, W, H, 'loose');
    let held: THREE.Vector3 | null = null;
    if (stage === 'loose') {
      // Long hair down the back of the head and between the shoulder blades.
      const path = [
        crown.clone(),
        head.clone().add(new THREE.Vector3(0, headR * 0.5, -headR * 1.0)),
        head.clone().add(new THREE.Vector3(0, -headR * 0.7, -headR * 1.25)),
        head.clone().add(new THREE.Vector3(0, -headR * 2.6, -headR * 1.75 - limb * 0.6)),
        head.clone().add(new THREE.Vector3(0.01, -headR * 4.2, -headR * 2.0 - limb * 0.9)),
      ];
      s.mesh(strand(path, headR * 0.75, headR * 0.32, 0.45), oiled);
    } else if (stage === 'gathered') {
      held = crown.clone().add(new THREE.Vector3(0.03, 0.2 + random() * 0.04, -0.05));
      const path = [
        head.clone().add(new THREE.Vector3(0, headR * 0.6, -headR * 0.7)),
        crown.clone().add(new THREE.Vector3(0, 0.04, -0.01)),
        crown.clone().lerp(held, 0.6),
        held.clone(),
        held.clone().add(new THREE.Vector3(-0.02, 0.08, 0.03)),
      ];
      s.mesh(strand(path, headR * 0.55, headR * 0.12), oiled);
    } else if (stage === 'tied') {
      const cord = s.material('#f4f2ea', { roughness: 0.7 });
      const tie = s.cylinder(headR * 0.26, headR * 0.26, headR * 0.22, crown.clone().add(new THREE.Vector3(0, headR * 0.12, -headR * 0.1)).toArray() as P, cord, 12);
      tie.rotation.x = -0.4;
      // Loose cord ends trailing.
      s.rod(crown.clone().add(new THREE.Vector3(0.01, headR * 0.12, -headR * 0.2)).toArray() as P, crown.clone().add(new THREE.Vector3(0.05, -headR * 0.5, -headR * 0.6)).toArray() as P, 0.003, cord);
    }

    // ---- the hairdresser, standing behind and to one side, reaching into the hair
    const h = mix(1.6, 1.72, random());
    const tSkin = pickSkin(random);
    const shirt = pick(random, ['#e9e6de', '#8f8f93', '#2b2b30', '#c9c3b4']);
    const T = figure(s, {
      height: h, build: 'slight', style: 'doll', hair: 'short', hairColor: pick(random, ['#1a1512', '#2b2420', '#555049']), skin: tSkin,
      top: shirt, bottom: '#2a2b30', shoes: pick(random, ['#ece8dd', '#2a2a2c']), sleeves: 'long', pose: 'standing', gaze: 'down',
    });
    s.root.add(T.root);
    const tr = rig(T);
    const back = stage === 'finished';
    tr.bow(back ? 4 : 14, 0, 0);
    tr.look(back ? 16 : 24, 0);
    T.settle();
    const side = 1;
    const standAt = new THREE.Vector3(head.x + side * (back ? 0.42 : 0.3), 0, head.z - (back ? 0.62 : 0.46));
    T.root.position.copy(standAt);
    T.root.rotation.y = Math.atan2(head.x - standAt.x, head.z - standAt.z) * 0.85;
    T.root.updateMatrixWorld(true);

    // Apron: a bib over the chest and a skirt to the knees.
    const ts = sizes(h, 'slight');
    const apron = s.material(APRON_COLOUR[a.apron], { roughness: 0.85 });
    const bib = new THREE.Mesh(new THREE.BoxGeometry(h * 0.16, ts.torsoL * 0.62, 0.012), apron);
    bib.position.set(0, ts.torsoL * 0.52, ts.limb * 1.42);
    T.joints.spine.add(bib);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(h * 0.2, h * 0.33, 0.014), apron);
    skirt.position.set(0, -h * 0.13, ts.limb * 1.55);
    skirt.rotation.x = -0.04;
    T.pelvis.add(skirt);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(h * 0.12, h * 0.06, 0.012), s.material(APRON_COLOUR[a.apron], { roughness: 0.95 }));
    pocket.position.set(0, -h * 0.07, ts.limb * 1.55 + 0.012);
    T.pelvis.add(pocket);
    const boxwood = s.material('#d9b56a', { roughness: 0.55 });
    for (let i = 0; i < 2; i++) {
      const spare = comb(0.07 + i * 0.02, boxwood);
      spare.rotation.set(Math.PI / 2, 0, 0.1 - i * 0.2);
      spare.position.set(-0.02 + i * 0.035, -h * 0.045, ts.limb * 1.55 + 0.02);
      T.pelvis.add(spare);
    }
    const strings = new THREE.Mesh(new THREE.TorusGeometry(ts.hipW * 1.15, 0.006, 6, 24), apron);
    strings.rotation.x = Math.PI / 2;
    strings.scale.y = 0.8;
    T.pelvis.add(strings);
    for (const mesh of [bib, skirt, pocket, strings]) mesh.castShadow = mesh.receiveShadow = true;

    // Hands: comb in the right, the left holds the hair or steadies the head.
    const shoulderW = at(s, W.joints.shoulders.left);
    let leftTarget: THREE.Vector3, rightTarget: THREE.Vector3;
    if (stage === 'loose') {
      leftTarget = shoulderW.clone().add(new THREE.Vector3(0, limb * 1.1, -0.02));
      rightTarget = head.clone().add(new THREE.Vector3(0.02, -headR * 1.1, -headR * 1.9));
    } else if (stage === 'gathered') {
      leftTarget = held!.clone();
      rightTarget = head.clone().add(new THREE.Vector3(0.03, headR * 0.5, -headR * 1.6));
    } else if (stage === 'tied') {
      leftTarget = crown.clone().add(new THREE.Vector3(headR * 0.9, headR * 0.2, -headR * 0.2));
      rightTarget = crown.clone().add(new THREE.Vector3(-headR * 0.5, headR * 0.35, -headR * 0.9));
    } else {
      const onT = (x: number, y: number, z: number) => s.root.worldToLocal(T.pelvis.localToWorld(new THREE.Vector3(x, y, z)));
      leftTarget = a.mirror ? head.clone().add(new THREE.Vector3(0.08, headR * 0.4, -headR * 3.2)) : onT(ts.hipW * 1.9, 0.03, 0.02);
      rightTarget = onT(-ts.hipW * 1.6, -0.06, 0.16);
    }
    reach(T, 'left', leftTarget, -0.6, 0.55);
    reach(T, 'right', rightTarget, 0.5, 0.55);
    T.root.updateMatrixWorld(true);
    const wide = comb(0.15, boxwood);
    wide.rotation.set(0, Math.PI / 2, stage === 'finished' ? 0.3 : 0);
    wide.position.set(0, -0.01, 0.015);
    T.hands.right.add(wide);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: '#cfdde6', metalness: 0.85, roughness: 0.08 });
    const lacquer = s.material('#2a1a14', { roughness: 0.3 });
    const handMirror = () => {
      const group = new THREE.Group();
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 24), lacquer);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.062, 24), mirrorMat);
      glass.rotation.x = -Math.PI / 2;
      glass.position.y = 0.007;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.11), lacquer);
      handle.position.z = 0.12;
      back.castShadow = handle.castShadow = true;
      group.add(back, glass, handle);
      return group;
    };
    if (stage === 'finished' && a.mirror) {
      const m = handMirror();
      m.rotation.set(-Math.PI / 2, 0, 0);
      m.position.set(0, -0.12, 0);
      T.hands.left.add(m);
    }

    // ---- the tools
    const kitAt = new THREE.Vector3(head.x - 0.72, 0, head.z - 0.05);
    const tin = (x: number, y: number, z: number) => {
      s.cylinder(0.045, 0.045, 0.032, [x, y + 0.016, z], s.material('#b8963f', { metalness: 0.6, roughness: 0.35 }), 20);
      const label = paint(128, 32, (c) => { c.fillStyle = '#7a1c1c'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#f0e2b0'; for (let i = 0; i < 5; i++) c.fillRect(14 + i * 22, 9, 12, 14); });
      const band = s.mesh(new THREE.CylinderGeometry(0.0455, 0.0455, 0.014, 20, 1, true), new THREE.MeshStandardMaterial({ map: label, roughness: 0.6 }), [x, y + 0.017, z]);
      void band;
    };
    const cloth = (x: number, y: number, z: number) => {
      const c = s.box([0.16, 0.014, 0.11], [x, y + 0.007, z], s.material('#f0ece2', { roughness: 0.95 }));
      c.rotation.y = (random() - 0.5) * 0.5;
    };
    const lyingComb = (x: number, y: number, z: number, w: number, turn: number) => {
      const c = comb(w, boxwood);
      c.position.set(x, y + 0.004, z);
      c.rotation.y = turn;
      s.root.add(c);
    };
    const cords = (x: number, y: number, z: number) => {
      const white = s.material('#f6f4ee', { roughness: 0.7 });
      for (let i = 0; i < 5; i++) s.rod([x - 0.08, y + 0.004 + i * 0.002, z + i * 0.008], [x + 0.08, y + 0.004 + i * 0.002, z + i * 0.008 + (random() - 0.5) * 0.02], 0.003, white);
    };
    let surface = 0;
    if (a.kit === 'table') {
      surface = 0.56;
      const lacq = s.material('#3a2418', { roughness: 0.35 });
      s.box([0.5, 0.03, 0.36], [kitAt.x, surface - 0.015, kitAt.z], lacq);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.03, surface - 0.03, 0.03], [kitAt.x + x * 0.22, (surface - 0.03) / 2, kitAt.z + z * 0.15], lacq);
      s.box([0.44, 0.02, 0.3], [kitAt.x, 0.12, kitAt.z], lacq);
    } else if (a.kit === 'box') {
      surface = 0.34;
      const box = s.material('#b48a58', { roughness: 0.65 });
      s.box([0.46, surface, 0.3], [kitAt.x, surface / 2, kitAt.z], box);
      const drawer = s.box([0.4, 0.1, 0.26], [kitAt.x, 0.1, kitAt.z + 0.14], s.material('#c39a66', { roughness: 0.65 }));
      void drawer;
      s.box([0.06, 0.02, 0.015], [kitAt.x, 0.12, kitAt.z + 0.275], s.material('#3a2a1a'));
      // A few small tins and cords in the open drawer.
      s.cylinder(0.03, 0.03, 0.03, [kitAt.x - 0.1, 0.165, kitAt.z + 0.16], s.material('#b8963f', { metalness: 0.5, roughness: 0.4 }), 14);
    } else {
      surface = 0.012;
      const mat = s.box([0.62, 0.012, 0.44], [kitAt.x, 0.006, kitAt.z + 0.05], s.material('#3b4a6b', { roughness: 0.95 }));
      mat.rotation.y = (random() - 0.5) * 0.3;
    }
    tin(kitAt.x - 0.12, surface, kitAt.z - 0.06);
    cloth(kitAt.x + 0.1, surface, kitAt.z - 0.07);
    lyingComb(kitAt.x - 0.05, surface, kitAt.z + 0.08, 0.12, 0.15);
    lyingComb(kitAt.x + 0.12, surface, kitAt.z + 0.09, 0.08, -0.2);
    if (a.kit !== 'table') cords(kitAt.x, surface, kitAt.z - 0.12);
    if (a.mirror && stage !== 'finished') {
      const m = handMirror();
      m.position.set(kitAt.x + 0.02, surface + 0.006, kitAt.z + 0.02);
      m.rotation.y = 1.9 + random() * 0.5;
      s.root.add(m);
    }

    // ---- the floor under them
    const span = new THREE.Box3().setFromObject(s.root);
    const fx = (span.min.x + span.max.x) / 2, fz = (span.min.z + span.max.z) / 2;
    const fw = span.max.x - span.min.x + 0.25, fd = span.max.z - span.min.z + 0.25;
    if (a.floor === 'tatami') {
      const tex = paint(512, 256, (c) => {
        c.fillStyle = `hsl(${52 - mood.wear * 12}, ${36 - mood.wear * 14}%, ${64 - mood.wear * 14}%)`;
        c.fillRect(0, 0, 512, 256);
        for (let y = 0; y < 256; y += 3) { c.fillStyle = `rgba(80,70,30,${0.1 + random() * 0.16})`; c.fillRect(0, y, 512, 1); }
        c.fillStyle = '#23252c';
        c.fillRect(0, 0, 512, 14); c.fillRect(0, 242, 512, 14);
      });
      s.mesh(new THREE.BoxGeometry(fw, 0.03, fd), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), [fx, -0.015, fz]);
    } else if (a.floor === 'newspaper') {
      const sheet = paint(256, 320, (c) => {
        c.fillStyle = '#e8e3d4';
        c.fillRect(0, 0, 256, 320);
        c.fillStyle = '#3a3a3a';
        c.fillRect(16, 14, 224, 22);
        for (let col = 0; col < 4; col++)
          for (let row = 0; row < 26; row++) if (random() > 0.08) c.fillRect(16 + col * 58, 48 + row * 10, 46 * (0.6 + random() * 0.4), 4);
        c.fillStyle = '#8a8a86';
        c.fillRect(132, 120, 100, 70);
      });
      const paper = new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.95 });
      for (let i = 0; i < 4; i++) {
        const sh = s.mesh(new THREE.BoxGeometry(0.58, 0.003, 0.72), paper, [hips.x + (i % 2 - 0.5) * 0.5 + (random() - 0.5) * 0.1, 0.002 + i * 0.001, hips.z + (Math.floor(i / 2) - 0.5) * 0.62]);
        sh.rotation.y = (random() - 0.5) * 0.5;
      }
    } else {
      const boards = paint(256, 256, (c) => {
        for (let i = 0; i < 8; i++) { c.fillStyle = `hsl(28, 32%, ${40 + random() * 10 - mood.wear * 10}%)`; c.fillRect(0, i * 32, 256, 31); c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, i * 32 + 31, 256, 1); }
      });
      s.mesh(new THREE.BoxGeometry(fw, 0.03, fd), new THREE.MeshStandardMaterial({ map: boards, roughness: 0.75 }), [fx, -0.015, fz]);
    }
    // Stray hairs and drops of oil on the floor, more of them the longer the room has gone unswept.
    const hairs = Math.round(8 + mood.wear * 40);
    const strayGeo = new THREE.BoxGeometry(0.06, 0.0025, 0.0025);
    const stray = new THREE.InstancedMesh(strayGeo, oiled, hairs);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < hairs; i++) {
      const r = Math.sqrt(random()) * 0.45, ang = random() * Math.PI * 2;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI);
      sc.set(0.5 + random(), 1, 1);
      m4.compose(new THREE.Vector3(hips.x + Math.cos(ang) * r, 0.008, hips.z - 0.1 + Math.sin(ang) * r), q, sc);
      stray.setMatrixAt(i, m4);
    }
    stray.instanceMatrix.needsUpdate = true;
    s.root.add(stray);

    // Motion: the comb hand strokes, faster with the scene's energy.
    const shoulder = T.joints.shoulders.right;
    const rest = shoulder.quaternion.clone();
    const wobble = new THREE.Quaternion();
    const axis = new THREE.Vector3(1, 0, 0);
    const speed = mix(0.8, 3.2, mood.energy);
    const phase = random() * 6.28;
    return s.finish({
      update(dt, time) {
        W.update(dt, time);
        T.update(dt, time);
        wobble.setFromAxisAngle(axis, Math.sin(time * speed + phase) * (stage === 'finished' ? 0.01 : 0.06));
        shoulder.quaternion.copy(rest).multiply(wobble);
      },
    });
  },
});
