import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix } from '@conjure/kit';

type V3 = [number, number, number];
type R = () => number;

function sheetTexture(kind: 'plain' | 'flannel' | 'dragging' | 'belted', random: R, wear: number) {
  const S = 512;
  const canvas = document.createElement('canvas'); canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f3f1ea'; ctx.fillRect(0, 0, S, S);
  if (kind === 'flannel') {
    const scheme = Math.floor(random() * 3);
    if (scheme === 0) {
      // Buffalo-check flannel.
      ctx.fillStyle = '#b8282e'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = 'rgba(20,20,24,0.55)';
      for (let i = 0; i < S; i += 64) { ctx.fillRect(i, 0, 32, S); ctx.fillRect(0, i, S, 32); }
    } else if (scheme === 1) {
      // Pale blue with stars and moons.
      ctx.fillStyle = '#b9d2ea'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#f6e27a';
      for (let i = 0; i < 70; i++) {
        const x = random() * S, y = random() * S, r = 6 + random() * 6;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.fill();
      }
    } else {
      // Green tartan.
      ctx.fillStyle = '#2f5e3a'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = 'rgba(25,40,80,0.6)'; for (let i = 0; i < S; i += 80) { ctx.fillRect(i, 0, 36, S); ctx.fillRect(0, i, S, 36); }
      ctx.fillStyle = 'rgba(230,200,60,0.7)'; for (let i = 20; i < S; i += 80) { ctx.fillRect(i, 0, 3, S); ctx.fillRect(0, i, S, 3); }
    }
  } else {
    ctx.strokeStyle = 'rgba(180,175,160,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < S; i += 4) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke(); }
    // A faint stitched hem round the edge.
    ctx.strokeStyle = 'rgba(160,155,140,0.6)'; ctx.setLineDash([6, 5]); ctx.strokeRect(10, 10, S - 20, S - 20); ctx.setLineDash([]);
  }
  // The edges have been dragged across lawns and steps.
  const g = ctx.createLinearGradient(0, S * 0.45, 0, 0);
  g.addColorStop(0, 'rgba(90,80,60,0)'); g.addColorStop(1, `rgba(90,80,60,${0.12 + wear * 0.5})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  if (wear > 0.4) for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(80,110,50,0.3)'; ctx.beginPath(); ctx.ellipse(random() * S, random() * S * 0.2, 10 + random() * 20, 5 + random() * 10, random() * 3, 0, 7); ctx.fill(); }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export default defineThing({
  questions: {
    sheet: choice('What kind of sheet is the ghost?', {
      plain: 'A plain white bedsheet, the classic.',
      flannel: 'A patterned flannel sheet off a kid\'s bed: plaid, tartan or stars.',
      dragging: 'A sheet far too long, pooling and dragging along the ground behind.',
      belted: 'A white sheet tied round the middle with a belt so it can walk.',
    }),
    carry: choice('What are they carrying for candy?', {
      pail: 'An orange plastic jack-o\'-lantern pail.',
      pillowcase: 'A lumpy pillowcase, already heavy with candy.',
      nothing: 'Nothing: both hands stay hidden under the sheet.',
    }),
    pose: choice('What are they doing?', {
      waving: 'Waving: one arm raised under the sheet, a pointed peak of cloth.',
      steps: 'Climbing a step, one foot up, mid-stride.',
      shy: 'Standing shyly, head ducked, very still.',
      offering: 'Holding the bag straight out in front, waiting.',
    }),
    under: choice('What shows under the hem?', {
      sneakers: 'Bright sneakers and the cuffs of their jeans.',
      boots: 'Red rubber rain boots.',
      pyjamas: 'Striped pyjama legs and fuzzy slippers.',
      nothing: 'Nothing: the sheet reaches the ground.',
    }),
    grownup: choice('Is a grown-up with them?', {
      none: 'No: they are bravely alone.',
      crouching: 'A grown-up crouches beside them, straightening the sheet.',
      holding: 'A grown-up stands at their side, holding their hand through the sheet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.05 + random() * 0.2;
    const side = random() < 0.5 ? 1 : -1;

    // ---- the child underneath ----
    const legs = {
      sneakers: { bottom: '#3d5a8a', shoes: ['#e8e4dc', '#d8343a', '#f0a0c0', '#2a9a5a'][Math.floor(random() * 4)] },
      boots: { bottom: '#c8202a', shoes: '#c8202a' },
      pyjamas: { bottom: '#9db8d8', shoes: '#efd8c0' },
      nothing: { bottom: '#3d4652', shoes: '#2a2a2c' },
    }[a.under];
    const person = figure(s, {
      height: H, build: 'average', style: 'doll', hair: 'short', pose: a.pose === 'steps' ? 'walking' : 'standing',
      gaze: a.pose === 'shy' ? 'down' : 'ahead', top: '#e9e6dc', bottom: legs.bottom, shoes: legs.shoes, sleeves: 'long',
    });
    s.root.add(person.root);
    const { joints } = person;
    let stepTop = 0;
    if (a.pose === 'steps') {
      const front = side > 0 ? 'left' : 'right', back = side > 0 ? 'right' : 'left';
      joints.hips[back].rotation.x = 0.18; joints.knees[back].rotation.x = 0.15; joints.ankles[back].rotation.x = -0.33;
      joints.body.rotation.x = 0.08;
      // Lift the front foot until it stands on a porch step.
      for (let lift = 0.7; lift < 1.6; lift += 0.05) {
        joints.hips[front].rotation.x = -lift; joints.knees[front].rotation.x = lift * 1.05; joints.ankles[front].rotation.x = -(lift * 1.05 - lift);
        person.settle();
        s.root.updateMatrixWorld(true);
        if (new THREE.Box3().setFromObject(joints.ankles[front]).min.y >= 0.15) break;
      }
    }
    if (a.pose === 'shy') { joints.spine.rotation.x = 0.1; joints.body.rotation.z = side * 0.04; }
    // Pyjama stripes on the legs.
    if (a.under === 'pyjamas') {
      const legMesh = joints.hips.left.children[0] as THREE.Mesh;
      const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 64;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#9db8d8'; ctx.fillRect(0, 0, 16, 64); ctx.fillStyle = '#f3f1ea'; for (let y = 0; y < 64; y += 12) ctx.fillRect(0, y, 16, 5);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const mat = legMesh.material as THREE.MeshStandardMaterial; mat.map = map; mat.color.set('#ffffff');
    }
    s.root.updateMatrixWorld(true);
    const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
    const head = world(person.head), pelvis = world(person.pelvis);
    const shoulderY = world(joints.shoulders.left).y;
    const headR = 0.064 * H;
    // Everything above the hips disappears under the sheet: only the cloth shows it.
    joints.spine.visible = false;

    if (a.pose === 'steps') {
      const front = side > 0 ? 'left' : 'right';
      const foot = new THREE.Box3().setFromObject(joints.ankles[front]);
      stepTop = Math.max(0.05, foot.min.y);
      const fz = foot.min.z;
      const wood = s.material('#8a6a4a', { roughness: 0.85 });
      s.box([1.0, stepTop, 0.6], [0, stepTop / 2, fz + 0.3 - 0.03], wood);
      s.box([1.02, 0.025, 0.05], [0, stepTop - 0.0125, fz - 0.02], s.material('#6a4a32', { roughness: 0.85 }));
    }

    // ---- the sheet ----
    // A bell of cloth: a dome over the head, a slope to the shoulders, then a fall to a wavy hem,
    // with folds that deepen toward the hem and peaks wherever an arm or knee pushes it out.
    const Rh = headR * 1.3, Rs = 0.17 * H, flat = 0.8;
    const ys = shoulderY + 0.01 * H;
    const long = a.sheet === 'dragging' || a.under === 'nothing';
    const hemY = long ? 0.004 : 0.15 * H + random() * 0.03;
    const fold = [random() * 6, random() * 6, random() * 6];
    const smooth = (e0: number, e1: number, x: number) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const peaks: { theta: number; v: number; width: number; reach: number; to: THREE.Vector3 }[] = [];
    if (a.pose === 'waving') peaks.push({ theta: side * Math.PI / 2, v: 0.36, width: 0.55, reach: 0.14, to: new THREE.Vector3(side * 0.26 * H, shoulderY + 0.36 * H, pelvis.z) });
    let hand: THREE.Vector3 | null = null;
    if (a.pose === 'offering') {
      hand = new THREE.Vector3(side * 0.13 * H, shoulderY - 0.1 * H, pelvis.z + 0.34 * H);
      peaks.push({ theta: side * 0.45, v: 0.46, width: 0.5, reach: 0.12, to: hand.clone().add(new THREE.Vector3(0, 0.02, -0.04)) });
    }
    if (a.pose === 'steps') {
      const knee = world(joints.knees[side > 0 ? 'left' : 'right']);
      peaks.push({ theta: side * 0.35, v: 0.72, width: 0.6, reach: 0.12, to: new THREE.Vector3(knee.x, knee.y + 0.02, knee.z + 0.07) });
    }
    // Holding a grown-up's hand: the arm under the sheet lifts toward them.
    const holdAt = new THREE.Vector3(-side * 0.3 * H, Math.max(0.7, shoulderY - 0.02), pelvis.z + 0.03);
    if (a.grownup === 'holding') peaks.push({ theta: -side * Math.PI / 2, v: 0.5, width: 0.6, reach: 0.15, to: holdAt.clone().add(new THREE.Vector3(side * 0.03, 0, 0)) });
    const waistY = pelvis.y + 0.07 * H;
    const shape = (u: number, v: number, t: THREE.Vector3) => {
      const th = Math.PI * 2 * u + Math.PI;
      let r: number, y: number;
      if (v < 0.22) { const ph = v / 0.22 * Math.PI / 2; r = Rh * Math.sin(ph); y = head.y + Rh * Math.cos(ph) * 0.95; }
      else if (v < 0.36) { const k = smooth(0, 1, (v - 0.22) / 0.14); r = mix(Rh, Rs, k); y = mix(head.y, ys, (v - 0.22) / 0.14); }
      else {
        const k = (v - 0.36) / 0.64;
        const train = long ? (a.sheet === 'dragging' ? mix(0.1, 0.7, Math.max(0, -Math.cos(th))) : 0.06) * H : 0;
        const hem = hemY + (long ? 0 : 0.03 * Math.sin(3 * th + fold[2]) + 0.015 * Math.sin(7 * th + fold[0]));
        r = Rs * (1 + 0.22 * k * k);
        y = mix(ys, hem - train, k);
        if (y < 0.004) { r += 0.004 - y; y = 0.004 + 0.01 * k * Math.abs(Math.sin(5 * th + fold[1])); }
      }
      // Folds, growing toward the hem.
      r *= 1 + (0.07 * Math.sin(5 * th + fold[0]) + 0.045 * Math.sin(9 * th + fold[1])) * smooth(0.3, 1, v);
      if (a.sheet === 'belted') r *= 1 - 0.22 * Math.exp(-(((y - waistY) / (0.045 * H)) ** 2));
      t.set(head.x + r * Math.sin(th), y, pelvis.z + r * Math.cos(th) * flat);
      for (const p of peaks) {
        const d = Math.atan2(Math.sin(th - p.theta), Math.cos(th - p.theta));
        const g = Math.exp(-(d * d) / (p.width * p.width * 0.25)) * Math.exp(-(((v - p.v) / p.reach) ** 2));
        t.lerp(p.to, g);
      }
      return t;
    };
    const texture = sheetTexture(a.sheet, random, mood.wear);
    const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92, side: THREE.DoubleSide });
    const sheet = s.surface(shape, cloth, { segments: [96, 56], wrap: true });
    void sheet;
    const at = (theta: number, v: number) => shape((theta - Math.PI) / (Math.PI * 2), v, new THREE.Vector3());

    // Two eye holes, cut a little uneven.
    const holeMat = s.material('#151413', { roughness: 1 });
    const vEye = 0.2;
    for (const ex of [-1, 1]) {
      const th = ex * 0.36 + (random() - 0.5) * 0.04;
      const p = at(th, vEye + (random() - 0.5) * 0.01);
      const n = new THREE.Vector3(Math.sin(th), 0.1, Math.cos(th) * flat).normalize();
      const eye = s.mesh(new THREE.CircleGeometry(1, 16), holeMat, p.addScaledVector(n, 0.003).toArray() as V3);
      eye.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      eye.scale.set(0.016 * H * (0.9 + random() * 0.25), 0.021 * H * (0.9 + random() * 0.25), 1);
      eye.castShadow = false;
      if (a.sheet === 'flannel') {
        // The pale cut edge of the flannel round each hole.
        const edge = s.mesh(new THREE.RingGeometry(1, 1.35, 18), s.material('#efe9da', { roughness: 1 }), eye.position.toArray() as V3);
        edge.quaternion.copy(eye.quaternion); edge.scale.copy(eye.scale); edge.castShadow = false;
      }
    }
    if (a.sheet === 'belted') {
      const rx = Rs * (1 + 0.22 * ((waistY - ys) / (hemY - ys)) ** 2) * 0.8;
      const belt = s.ring(1, 0.012, [head.x, waistY, pelvis.z], s.material(random() < 0.5 ? '#5a3a22' : '#b89a6a', { roughness: 0.8 }));
      belt.rotation.x = Math.PI / 2; belt.scale.set(rx, rx * flat, 1);
      s.ball([0.03, 0.025, 0.02], [head.x + rx * 0.3, waistY - 0.01, pelvis.z + rx * flat * 0.95], belt.material as THREE.Material, 10);
    }
    const sideV = (y: number) => 0.36 + 0.64 * (ys - y) / (ys - hemY);

    // ---- what they carry ----
    const orange = s.material('#ee7a12', { roughness: 0.35 });
    const black = s.material('#141414', { roughness: 0.4 });
    const makePail = (at: THREE.Vector3, handleTop: THREE.Vector3 | null) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.085, 0.03], [0.095, 0.08], [0.088, 0.13], [0.082, 0.145], [0.078, 0.145], [0.078, 0.01], [0, 0.01]].map(([x, y]) => new THREE.Vector2(x, y)), 28), orange);
      body.castShadow = true; g.add(body);
      for (const dx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.022, 3), black); eye.position.set(dx * 0.03, 0.095, 0.09); eye.rotation.x = Math.PI / 2; eye.scale.z = 0.25; g.add(eye); }
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 4, 16, Math.PI), black); mouth.position.set(0, 0.07, 0.088); mouth.rotation.z = Math.PI; g.add(mouth);
      const loot = ['#c8102e', '#f4d40c', '#1f5fd1', '#7b2fa8', '#2f9e44', '#5a3320'];
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.022), s.material(loot[i % loot.length], { roughness: 0.4, metalness: 0.2 })); c.position.set((random() - 0.5) * 0.09, 0.13 + random() * 0.02, (random() - 0.5) * 0.09); c.rotation.set(random(), random() * 6, random()); g.add(c); }
      g.position.copy(at);
      s.root.add(g);
      if (handleTop) s.tube([[at.x - 0.085, at.y + 0.13, at.z], [handleTop.x - 0.03, handleTop.y, handleTop.z], [handleTop.x + 0.03, handleTop.y, handleTop.z], [at.x + 0.085, at.y + 0.13, at.z]], 0.005, black);
      else s.tube([[at.x - 0.088, at.y + 0.13, at.z], [at.x - 0.06, at.y + 0.22, at.z - 0.05], [at.x + 0.06, at.y + 0.22, at.z - 0.05], [at.x + 0.088, at.y + 0.13, at.z]], 0.005, black);
    };
    const makeSack = (top: THREE.Vector3) => {
      const tone = ['#f2efe6', '#c9dcef', '#f3d0dc', '#e8e0b0'][Math.floor(random() * 4)];
      const cloth2 = s.material(tone, { roughness: 0.95 });
      const h = 0.34;
      s.lathe([[0.001, 0], [0.09, 0.01], [0.13, 0.08], [0.125, 0.17], [0.09, 0.25], [0.035, 0.3], [0.025, h], [0.04, h + 0.03]], cloth2, [top.x, top.y - h - 0.03, top.z]);
      for (let i = 0; i < 4; i++) s.ball([0.05, 0.04, 0.05], [top.x + (random() - 0.5) * 0.12, top.y - h + 0.06 + random() * 0.12, top.z + 0.06 + random() * 0.03], cloth2, 10);
    };
    const skin = s.material(['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)], { roughness: 0.6 });
    if (a.carry !== 'nothing') {
      if (hand) {
        // A hand pokes out through the front of the sheet.
        const from = hand.clone().add(new THREE.Vector3(0, 0.01, -0.06));
        const at = hand.clone().add(new THREE.Vector3(0, -0.01, 0.04));
        s.rod(from.toArray() as V3, at.toArray() as V3, 0.022 * H, skin);
        s.ball([0.03 * H, 0.026 * H, 0.034 * H], [at.x, at.y - 0.01, at.z + 0.01], skin, 10);
        if (a.carry === 'pail') makePail(new THREE.Vector3(at.x, at.y - 0.26, at.z + 0.01), new THREE.Vector3(at.x, at.y - 0.015, at.z + 0.01));
        else makeSack(new THREE.Vector3(at.x, at.y - 0.015, at.z + 0.01));
      } else {
        // Held low under the sheet: only the bag shows below the hem, or it waits on the ground.
        const x = -side * 0.26 * H, z = pelvis.z + 0.03;
        const hem = long ? 0 : hemY;
        const onGround = !Number.isFinite(hem) || hem < 0.3 || a.pose === 'steps';
        if (a.carry === 'pail') {
          if (onGround) makePail(new THREE.Vector3(-side * 0.42 * H, a.pose === 'steps' ? 0 : 0, pelvis.z + 0.18), null);
          else makePail(new THREE.Vector3(x, Math.max(0, hem - 0.2), z + 0.04), new THREE.Vector3(x, hem + 0.04, z + 0.02));
        } else if (onGround) {
          const top = new THREE.Vector3(-side * 0.42 * H, 0.37, pelvis.z + 0.15);
          makeSack(top);
        } else makeSack(new THREE.Vector3(x, Math.min(hem + 0.04, 0.45), z + 0.05));
      }
    }

    // ---- the grown-up ----
    const adults: ReturnType<typeof figure>[] = [];
    if (a.grownup !== 'none') {
      const tops = ['#4a5a6a', '#7a3a2a', '#2f4a3a', '#5a4a6a', '#8a7a5a'], hairs = ['short', 'long', 'bun', 'cap'] as const;
      const adult = figure(s, {
        height: 1.66 + random() * 0.14, style: 'doll', pose: a.grownup === 'crouching' ? 'crouching' : 'standing', hair: hairs[Math.floor(random() * hairs.length)],
        top: tops[Math.floor(random() * tops.length)], bottom: '#2d3440', shoes: '#2a2422', skin: ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0'][Math.floor(random() * 4)], sleeves: 'long',
      });
      s.root.add(adult.root);
      adults.push(adult);
      const sx = -side;
      if (a.grownup === 'crouching') {
        adult.root.position.set(sx * 0.58, 0, pelvis.z + 0.12);
        adult.root.rotation.y = -sx * Math.PI / 2 + sx * 0.3;
        s.root.updateMatrixWorld(true);
        // Straightening the sheet at the shoulder.
        const best = at(sx * Math.PI / 2, 0.42);
        adult.reach(sx > 0 ? 'right' : 'left', best, { space: s.root });
        adult.lookAt(new THREE.Vector3(head.x, head.y, head.z), s.root);
      } else {
        adult.root.position.set(holdAt.x + sx * 0.36, 0, pelvis.z - 0.06);
        adult.root.rotation.y = -sx * 0.25;
        s.root.updateMatrixWorld(true);
        const target = holdAt.clone();
        adult.reach(sx > 0 ? 'right' : 'left', target, { space: s.root });
        adult.lookAt(new THREE.Vector3(head.x, head.y, head.z), s.root);
      }
    }

    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        for (const adult of adults) adult.update(dt, time);
      },
    });
  },
});
