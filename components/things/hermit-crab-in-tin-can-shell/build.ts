import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COLOURS = {
  orange: 'Bright tangerine orange, the classic cartoon crab.',
  red: 'Boiled-lobster red.',
  purple: 'Dusky purple with pale joints.',
  blue: 'Cobalt blue with pale joints.',
  sand: 'Sandy beige, camouflaged against the beach.',
} as const;
const TONES: Record<keyof typeof COLOURS, { body: string; joint: string }> = {
  orange: { body: '#f27d2a', joint: '#ffc591' },
  red: { body: '#d63a2e', joint: '#f3a08f' },
  purple: { body: '#7a4a9a', joint: '#d7bfe6' },
  blue: { body: '#2f6fd0', joint: '#bfe0ff' },
  sand: { body: '#cdb27e', joint: '#f0e2c0' },
};
const LABELS = {
  beans: 'BEANS in red on cream.',
  soup: 'SOUP in blue on cream.',
  peaches: 'PEACHES in orange on cream.',
  tuna: 'TUNA in teal, a grim joke for a crab.',
  none: 'No label, bare scratched tin.',
} as const;
const LABEL_TEXT: Record<keyof typeof LABELS, string | null> = { beans: 'BEANS', soup: 'SOUP', peaches: 'PEACHES', tuna: 'TUNA', none: null };
const LABEL_BAND: Record<keyof typeof LABELS, string> = { beans: '#c8322b', soup: '#1f4fa3', peaches: '#e8842a', tuna: '#1f8a8a', none: '#8a8d90' };

type P3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);

/** A paper label wrapped round a tin: a coloured band, the word twice so it reads from any side, rust by wear. */
function canLabel(text: string | null, band: string, wear: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c3c6ca';
  ctx.fillRect(0, 0, 1024, 512);
  if (text) {
    ctx.fillStyle = band;
    ctx.fillRect(0, 60, 1024, 392);
    ctx.fillStyle = '#f7f2e3';
    ctx.fillRect(0, 120, 1024, 272);
    ctx.fillStyle = band;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 150px sans-serif';
    for (const x of [256, 768]) ctx.fillText(text, x, 256, 440);
  } else {
    ctx.strokeStyle = 'rgba(90,90,95,0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const x = (i * 211) % 1024;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, 512);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(120,60,20,0.75)';
  for (let i = 0; i < Math.round(wear * 18); i++) {
    const x = (i * 397) % 1024, y = (i * 233) % 512;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + (i % 4) * 15, 20 + (i % 3) * 12, i, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Cream china with pink flowers and green leaves. */
function floral(cheer: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f6f1e6';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 16; i++) {
    const x = (i * 137 + 40) % 512, y = (i * 251 + 60) % 512;
    ctx.fillStyle = '#6f9a4a';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + side * 26, y + 14, 16, 7, side * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = cheer > 0.5 ? '#e8628a' : '#c97a95';
    for (let p = 0; p < 5; p++) {
      const angle = p / 5 * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2c84a';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 5, 512, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/** A small printed sticker. */
function sticker(text: string, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(text, 128, 66, 220);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    shell: choice('What is it wearing as a shell?', {
      can: 'A dented tin can with a paper label.',
      jar: 'A clear glass jar, the soft curled tail visible inside.',
      teapot: 'A floral china teapot, spout and handle sticking out.',
      mug: 'A chipped coffee mug with its handle on top.',
    }),
    label: choice('If it is a tin can, what does the label say?', LABELS),
    colour: choice('What colour is the crab?', COLOURS),
    size: score('How big is it?', ['Palm sized', 'Cat sized', 'A dog-sized cartoon crab']),
    eyes: choice('How far out of the shell is it?', {
      out: 'Right out, eye stalks up tall and looking around.',
      peeking: 'Half out, eyes peeking over the rim.',
      tucked: 'Pulled right inside, the claws blocking the door and two eyes glinting in the dark.',
    }),
    claw: noul('Is one claw raised high, waving or warning?'),
    doing: choice('What is it up to?', {
      scuttling: 'Scuttling sideways, legs mid-stride, a trail of little tracks behind it.',
      resting: 'Sitting still, legs tucked in, sunning itself.',
      hunting: 'House hunting: an empty spiral shell lies in front and a claw reaches out to test it.',
      snacking: 'Nibbling a strip of seaweed held in a claw.',
    }),
    ground: choice('What is it standing in?', {
      sand: 'Plain sand.',
      puddle: 'A shallow tide-pool puddle with a few pebbles.',
      shells: 'A scatter of small shells and bits of coral.',
      weed: 'A tangle of washed-up seaweed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = mix(0.32, 1.25, a.size);
    const tone = TONES[a.colour];
    const body = s.material(tone.body, { roughness: 0.55 });
    const joint = s.material(tone.joint, { roughness: 0.5 });
    const white = s.material('#f7f4ec', { roughness: 0.4 });
    const black = s.material('#1c1818', { roughness: 0.4 });
    const P = (x: number, y: number, z: number): P3 => [x * L, y * L, z * L];

    // The house: built in a group whose local +y runs from the mouth to the closed end,
    // tilted so the mouth sits low at the front and the closed end rides up behind.
    const cr = 0.24 * L, cl = 0.75 * L;
    const tilt = 12 * Math.PI / 180;
    const house = new THREE.Group();
    house.position.set(0, 0.25 * L, -0.08 * L);
    house.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)));
    s.root.add(house);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0], rotation?: P3) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      if (rotation) mesh.rotation.set(...rotation);
      mesh.castShadow = mesh.receiveShadow = true;
      house.add(mesh);
      return mesh;
    };
    const inside = s.material('#4a4046', { side: THREE.BackSide, roughness: 0.7 });
    if (a.shell === 'can') {
      const text = LABEL_TEXT[a.label];
      const labelPaint = new THREE.MeshStandardMaterial({ map: canLabel(text, LABEL_BAND[a.label], mood.wear), roughness: text ? 0.6 : 0.4, metalness: text ? 0.05 : 0.55 });
      add(new THREE.CylinderGeometry(cr, cr, cl, 28, 1, true), labelPaint, [0, cl / 2, 0]);
      add(new THREE.CylinderGeometry(cr * 0.985, cr * 0.985, cl, 28, 1, true), inside, [0, cl / 2, 0]);
      const tin = s.material('#c9ccd0', { metalness: 0.7, roughness: 0.35 });
      add(new THREE.CircleGeometry(cr, 28), tin, [0, cl, 0], [-Math.PI / 2, 0, 0]);
      for (const y of [0.01 * L, cl - 0.01 * L]) add(new THREE.TorusGeometry(cr, 0.016 * L, 8, 36), tin, [0, y, 0], [Math.PI / 2, 0, 0]);
    }
    if (a.shell === 'jar') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d8f0f4', transparent: true, opacity: 0.3, roughness: 0.08, metalness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      add(new THREE.CylinderGeometry(cr * 1.05, cr * 1.05, cl * 0.85, 28, 1, true), glass, [0, cl * 0.425, 0]).castShadow = false;
      add(new THREE.CircleGeometry(cr * 1.05, 28), glass, [0, cl * 0.85, 0], [-Math.PI / 2, 0, 0]).castShadow = false;
      const thread = new THREE.MeshStandardMaterial({ color: '#d4e8ec', transparent: true, opacity: 0.75, roughness: 0.15, depthWrite: false });
      for (const y of [0.03 * L, 0.075 * L]) add(new THREE.TorusGeometry(cr * 1.08, 0.012 * L, 8, 36), thread, [0, y, 0], [Math.PI / 2, 0, 0]);
      const paper = new THREE.MeshStandardMaterial({ map: sticker(['JAM', 'PICKLES', 'HONEY'][Math.floor(random() * 3)], '#8a2a2a', '#f3e9d2'), roughness: 0.85 });
      add(new THREE.PlaneGeometry(0.17 * L, 0.09 * L), paper, [cr * 1.06, cl * 0.45, 0], [0, Math.PI / 2, 0]);
    }
    if (a.shell === 'teapot') {
      const china = new THREE.MeshStandardMaterial({ map: floral(mood.cheer), roughness: 0.3, metalness: 0.05 });
      const profile = [[cr, 0], [cr * 1.3, cl * 0.12], [cr * 1.6, cl * 0.38], [cr * 1.55, cl * 0.62], [cr * 1.2, cl * 0.86], [cr * 0.6, cl * 0.98], [0, cl]].map(([x, y]) => new THREE.Vector2(x, y));
      add(new THREE.LatheGeometry(profile, 36), china);
      add(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p.x * 0.97, p.y)), 24), inside);
      const gold = s.material('#d9b14a', { metalness: 0.7, roughness: 0.3 });
      add(new THREE.TorusGeometry(cr, 0.012 * L, 8, 36), gold, [0, 0.005 * L, 0], [Math.PI / 2, 0, 0]);
      const spout = new THREE.CatmullRomCurve3([new THREE.Vector3(cr * 1.45, cl * 0.45, 0), new THREE.Vector3(cr * 2.1, cl * 0.6, 0), new THREE.Vector3(cr * 2.4, cl * 1.0, 0)]);
      add(new THREE.TubeGeometry(spout, 16, 0.042 * L, 10), china);
      add(new THREE.TorusGeometry(cl * 0.26, 0.03 * L, 8, 24, Math.PI), china, [-cr * 1.45, cl * 0.5, 0], [0, 0, Math.PI / 2]);
      // The lost lid lies on the sand.
      const lid = s.lathe([[0, 0], [cr * 0.95, 0], [cr * 0.9, 0.025 * L], [cr * 0.3, 0.04 * L], [0.03 * L, 0.06 * L], [0.04 * L, 0.1 * L], [0, 0.11 * L]], china, [0.55 * L, 0.001, 0.45 * L]);
      lid.rotation.y = random() * Math.PI;
    }
    if (a.shell === 'mug') {
      const glaze = s.material(mood.cheer > 0.5 ? '#f3efe6' : '#dcd6c8', { roughness: 0.35 });
      const mr = cr * 1.05, ml = cl * 0.8;
      add(new THREE.CylinderGeometry(mr, mr * 0.95, ml, 28, 1, true), glaze, [0, ml / 2, 0]);
      add(new THREE.CylinderGeometry(mr * 0.985, mr * 0.95 * 0.985, ml, 28, 1, true), inside, [0, ml / 2, 0]);
      add(new THREE.CircleGeometry(mr * 0.95, 28), glaze, [0, ml, 0], [-Math.PI / 2, 0, 0]);
      add(new THREE.TorusGeometry(mr, 0.012 * L, 8, 36), glaze, [0, 0.005 * L, 0], [Math.PI / 2, 0, 0]);
      add(new THREE.TorusGeometry(mr + 0.002 * L, 0.02 * L, 8, 36), s.material(['#d8402e', '#2f6fd0', '#3a9a5a'][Math.floor(random() * 3)]), [0, ml * 0.72, 0], [Math.PI / 2, 0, 0]);
      add(new THREE.TorusGeometry(0.11 * L, 0.025 * L, 8, 24, Math.PI), glaze, [0, ml * 0.5, mr + 0.02 * L], [0, Math.PI / 2, Math.PI / 2]);
      // The chip out of the rim.
      add(new THREE.SphereGeometry(0.04 * L, 8, 6), s.material('#b8ad9a', { roughness: 0.9 }), [mr * 0.75, 0.005 * L, -mr * 0.55]).scale.set(1, 0.4, 1);
    }

    // The crab.
    const exposure = { out: 1, peeking: 0.5, tucked: 0 }[a.eyes];
    const zBody = { out: 0.14, peeking: -0.04, tucked: -0.3 }[a.eyes] * L;
    const yBody = 0.22 * L;
    s.ball(P(0.2, 0.12, 0.16), [0, yBody, zBody], body, 16);
    s.ball(P(0.19, 0.07, 0.15), [0, yBody - 0.03 * L, zBody], joint, 12);
    s.tube([[0, yBody, zBody - 0.05 * L], [0, 0.26 * L, -0.2 * L], [0, 0.33 * L, -0.45 * L]], 0.08 * L, s.material('#e9a898', { roughness: 0.7 }));

    // Legs: three pairs, each a thigh, a knee bead and a tapering shin to the sand.
    if (exposure > 0) {
      const tuck = a.doing === 'resting' ? 1 : 0;
      for (const sx of [-1, 1])
        [0.1, 0, -0.1].forEach((zl, i) => {
          const stride = a.doing === 'scuttling' ? (i % 2 ? 0.07 : -0.07) : 0;
          const hz = zBody + zl * L;
          const hip: P3 = [sx * 0.15 * L, yBody - 0.02 * L, hz];
          const knee: P3 = [sx * mix(0.36, 0.28, tuck) * L, mix(0.36, 0.25, tuck) * L, hz + stride * L];
          const foot: P3 = [sx * mix(0.5, 0.36, tuck) * L, 0, hz + stride * 2 * L];
          s.rod(hip, knee, 0.028 * L, body, 0.022 * L);
          s.rod(knee, foot, 0.022 * L, body, 0.006 * L);
          s.ball([0.032 * L, 0.032 * L, 0.032 * L], knee, joint, 8);
        });
    }

    // Claws: the left one is the big one. A claw group points along its local +y.
    const claw = (sx: number, mode: 'forward' | 'raised' | 'reach' | 'door', gap: number) => {
      const big = sx === -1 ? 1.35 : 1;
      let wrist: THREE.Vector3, dir: THREE.Vector3;
      if (mode === 'door') {
        wrist = new THREE.Vector3(sx * 0.1 * L, 0.22 * L, -0.08 * L);
        dir = new THREE.Vector3(sx * 0.1, 0.25, 1).normalize();
      } else {
        const shoulder: P3 = [sx * 0.14 * L, yBody - 0.02 * L, zBody + 0.12 * L];
        const elbow: P3 = mode === 'raised' ? [sx * 0.3 * L, yBody + 0.16 * L, zBody + 0.1 * L]
          : mode === 'reach' ? [sx * 0.26 * L, yBody - 0.06 * L, zBody + 0.3 * L]
            : [sx * 0.3 * L, yBody - 0.06 * L, zBody + 0.26 * L];
        wrist = mode === 'raised' ? new THREE.Vector3(sx * 0.3 * L, yBody + 0.38 * L, zBody + 0.08 * L)
          : mode === 'reach' ? new THREE.Vector3(sx * 0.2 * L, 0.1 * L, zBody + 0.5 * L)
            : new THREE.Vector3(sx * 0.26 * L, 0.1 * L, zBody + 0.4 * L);
        dir = mode === 'raised' ? new THREE.Vector3(sx * 0.15, 1, 0.1).normalize()
          : mode === 'reach' ? new THREE.Vector3(0, -0.5, 1).normalize()
            : new THREE.Vector3(sx * 0.1, -0.25, 1).normalize();
        s.rod(shoulder, elbow, 0.03 * L, body, 0.026 * L);
        s.ball([0.036 * L, 0.036 * L, 0.036 * L], elbow, joint, 8);
        s.rod(elbow, wrist.toArray() as P3, 0.028 * L, body, 0.03 * L);
      }
      const pivot = new THREE.Group();
      pivot.position.copy(wrist);
      pivot.quaternion.setFromUnitVectors(UP, dir);
      const group = new THREE.Group();
      pivot.add(group);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), body);
      palm.scale.set(0.075 * L * big, 0.1 * L * big, 0.055 * L * big);
      palm.position.y = 0.06 * L * big;
      palm.castShadow = true;
      group.add(palm);
      const finger = new THREE.ConeGeometry(0.03 * L * big, 0.15 * L * big, 8);
      finger.translate(0, 0.075 * L * big, 0);
      const fixed = new THREE.Mesh(finger, body);
      fixed.position.set(0, 0.12 * L * big, -0.028 * L * big);
      fixed.rotation.x = 0.12;
      const movable = new THREE.Mesh(finger, body);
      movable.position.set(0, 0.12 * L * big, 0.028 * L * big);
      movable.rotation.x = -gap;
      fixed.castShadow = movable.castShadow = true;
      group.add(fixed, movable);
      s.root.add(pivot);
      return { pivot, group, wrist, dir, big };
    };
    const gap = a.doing === 'hunting' ? 0.5 : a.doing === 'snacking' ? 0.12 : 0.35;
    let waving: THREE.Group | null = null;
    let holding: ReturnType<typeof claw> | null = null;
    if (exposure === 0) {
      claw(-1, 'door', 0.1);
      claw(1, 'door', 0.1);
      for (const sx of [-1, 1]) {
        s.ball([0.045 * L, 0.045 * L, 0.045 * L], [sx * 0.07 * L, 0.34 * L, -0.13 * L], white, 10);
        s.ball([0.022 * L, 0.022 * L, 0.022 * L], [sx * 0.07 * L, 0.34 * L, -0.095 * L], black, 8);
      }
    } else {
      const bigMode = a.claw ? 'raised' : a.doing === 'hunting' ? 'reach' : 'forward';
      const left = claw(-1, bigMode, a.claw ? 0.9 : gap);
      if (a.claw) waving = left.group;
      holding = claw(1, 'forward', gap);
    }

    // Eyes on stalks, pivoting at the base so they can sway.
    const stalks: THREE.Group[] = [];
    if (exposure > 0)
      for (const sx of [-1, 1]) {
        const base = new THREE.Vector3(sx * 0.07 * L, yBody + 0.08 * L, zBody + 0.1 * L);
        const reach = exposure === 1 ? new THREE.Vector3(sx * 0.03 * L, 0.2 * L, 0.06 * L) : new THREE.Vector3(sx * 0.03 * L, 0.13 * L, 0.03 * L);
        const len = reach.length();
        const pivot = new THREE.Group();
        pivot.position.copy(base);
        pivot.quaternion.setFromUnitVectors(UP, reach.clone().normalize());
        const group = new THREE.Group();
        pivot.add(group);
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * L, 0.02 * L, len, 8), body);
        stalk.position.y = len / 2;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05 * L, 12, 10), white);
        eye.position.y = len;
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024 * L, 10, 8), black);
        pupil.position.set(0, len + 0.005 * L, 0.038 * L);
        stalk.castShadow = eye.castShadow = true;
        group.add(stalk, eye, pupil);
        s.root.add(pivot);
        stalks.push(group);
        s.rod([sx * 0.05 * L, yBody + 0.02 * L, zBody + 0.15 * L], [sx * 0.16 * L, yBody + 0.06 * L, zBody + 0.42 * L], 0.006 * L, joint, 0.003 * L);
      }

    // What it is up to.
    if (a.doing === 'scuttling' && exposure > 0) {
      const dots: { at: P3; size: number }[] = [];
      for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) dots.push({ at: [sx * (0.42 + (i % 2) * 0.08) * L + (random() - 0.5) * 0.04 * L, 0.004, (-0.55 - i * 0.13) * L], size: 0.028 * L });
      const tracks = s.scatter(new THREE.SphereGeometry(1, 8, 4), s.material('#b7a070', { roughness: 1 }), dots);
      tracks.scale.y = 0.3;
      tracks.castShadow = false;
    }
    if (a.doing === 'hunting') {
      const spare = new THREE.Group();
      spare.position.set(-0.2 * L, 0.1 * L, 0.72 * L);
      spare.rotation.set(0, 0.4, Math.PI / 2 - 0.2);
      const shellPaint = s.material('#efe0c4', { roughness: 0.6 });
      const whelk = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.1, 0.01], [0.12, 0.1], [0.1, 0.22], [0.06, 0.33], [0.025, 0.42], [0, 0.46]].map(([x, y]) => new THREE.Vector2(x * L, y * L)), 20), shellPaint);
      whelk.castShadow = true;
      spare.add(whelk);
      const stripe = s.material('#a8784a', { roughness: 0.7 });
      for (const [r, y] of [[0.115, 0.08], [0.1, 0.2], [0.062, 0.32]] as const) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * L, 0.008 * L, 6, 24), stripe);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y * L;
        spare.add(ring);
      }
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.085 * L, 20), s.material('#2a2024'));
      mouth.rotation.x = Math.PI / 2;
      mouth.position.y = 0.002 * L;
      spare.add(mouth);
      s.root.add(spare);
    }
    if (a.doing === 'snacking' && holding) {
      const tip = holding.wrist.clone().addScaledVector(holding.dir, 0.2 * L * holding.big);
      const weed = s.material('#4f8a3c', { roughness: 0.7 });
      s.tube([[tip.x, tip.y, tip.z], [tip.x + 0.04 * L, tip.y - 0.08 * L, tip.z + 0.05 * L], [tip.x - 0.02 * L, tip.y - 0.16 * L, tip.z + 0.1 * L], [tip.x + 0.03 * L, tip.y - 0.2 * L, tip.z + 0.16 * L]], 0.012 * L, weed);
    }

    // Underfoot.
    if (a.ground === 'puddle') {
      const water = new THREE.MeshStandardMaterial({ color: '#8fd0e8', transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.1, depthWrite: false });
      const pool = s.cylinder(0.85 * L, 0.85 * L, 0.008, [0.05 * L, 0.004, 0.1 * L], water, 28);
      pool.castShadow = false;
      pool.scale.z = 0.75;
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#8e8a80', { roughness: 0.9 }), Array.from({ length: 6 }, () => {
        const angle = random() * Math.PI * 2, r = 0.5 * L + random() * 0.35 * L;
        return { at: [Math.sin(angle) * r, 0.012 * L, 0.1 * L + Math.cos(angle) * r * 0.75] as P3, size: 0.03 * L + random() * 0.025 * L, color: random() < 0.3 ? '#c9c2b4' : '#8e8a80' };
      }));
    }
    if (a.ground === 'shells') {
      const half = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      half.scale(1, 0.6, 0.85);
      s.scatter(half, s.material('#f1e3cf', { roughness: 0.6 }), Array.from({ length: 12 }, () => {
        const angle = random() * Math.PI * 2, r = 0.45 * L + random() * 0.45 * L;
        return { at: [Math.sin(angle) * r, 0.002, Math.cos(angle) * r] as P3, size: 0.035 * L + random() * 0.03 * L, color: ['#f1e3cf', '#f3c7b3', '#ff8a5a', '#d8b4e8'][Math.floor(random() * 4)] };
      }));
    }
    if (a.ground === 'weed') {
      const weed = s.material('#4f7a34', { roughness: 0.8 });
      for (let i = 0; i < 6; i++) {
        const angle = random() * Math.PI * 2, r = 0.4 * L + random() * 0.45 * L;
        const x = Math.sin(angle) * r, z = Math.cos(angle) * r;
        const strand = s.ball([0.18 * L, 0.012 * L, 0.04 * L], [x, 0.008 * L, z], weed, 8);
        strand.rotation.y = random() * Math.PI;
      }
    }

    const speed = mix(0.3, 1.6, mood.energy);
    return s.finish({
      footprint: 0.65 * L,
      update: (_dt, time) => {
        stalks.forEach((g, i) => {
          g.rotation.z = Math.sin(time * 2.1 * speed + i * 1.7) * 0.1 * speed;
          g.rotation.x = Math.cos(time * 1.6 * speed + i) * 0.06 * speed;
        });
        if (waving) waving.rotation.z = Math.sin(time * 3 * speed) * 0.35 * speed;
      },
    });
  },
});
