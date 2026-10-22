import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  grey: 'Office grey tweed, anonymous.',
  navy: 'Corporate navy blue.',
  burgundy: 'Burgundy, a 1990s boardroom.',
  black: 'Black, serious and expensive-looking.',
  mustard: 'Mustard orange, a 1970s typing pool.',
  teal: 'Teal, a hopeful start-up.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = {
  grey: '#7d8288', navy: '#2f4470', burgundy: '#7a2f38', black: '#2b2c30', mustard: '#c98a2b', teal: '#2f8a86',
};

/** A cushion: a rounded slab, w wide (x), d deep (z), t thick (y), centred. */
function cushion(w: number, d: number, t: number, corner = 0.06) {
  const bevel = Math.min(t * 0.4, 0.03);
  const r = Math.min(corner, w / 2 - bevel - 0.001, d / 2 - bevel - 0.001);
  const x = w / 2 - bevel, z = d / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-x + r, -z);
  shape.lineTo(x - r, -z); shape.quadraticCurveTo(x, -z, x, -z + r);
  shape.lineTo(x, z - r); shape.quadraticCurveTo(x, z, x - r, z);
  shape.lineTo(-x + r, z); shape.quadraticCurveTo(-x, z, -x, z - r);
  shape.lineTo(-x, -z + r); shape.quadraticCurveTo(-x, -z, -x + r, -z);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: t - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
  geometry.translate(0, 0, -(t - bevel * 2) / 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export default defineThing({
  questions: {
    grade: choice('What grade of chair is it?', {
      task: 'A plain mid-back task chair, the kind bought by the hundred.',
      executive: 'A high-backed buttoned leather executive chair with fat padded arms and a chrome base.',
      handmedown: 'A broken-backed hand-me-down: the back lolls sideways, an arm is gone, tape holds the seat together.',
      secretary: 'A small armless typist chair with a little lumbar pad on a steel stalk.',
      mesh: 'A black mesh ergonomic chair with a headrest and too many levers.',
      drafting: 'A tall drafting stool with a foot ring, for a high bench.',
    }),
    colour: choice('What colour is the upholstery?', COLOURS),
    pose: choice('How has it been left?', {
      tucked: 'Squared up and tucked in, facing front, nobody due back.',
      spun: 'Spun away to one side, as if someone just stood up in a hurry.',
      reclined: 'Tipped back as far as it goes, feet-on-the-desk lazy.',
      toppled: 'Knocked over and lying on its side.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing. It is empty.',
      jacket: 'A suit jacket hung over the back.',
      files: 'A slumping stack of folders and paper on the seat.',
      bag: 'A handbag or satchel sitting on the seat.',
      cushion: 'A bright lumbar cushion brought from home.',
      balloon: 'A party balloon tied to the arm.',
      sign: 'A sheet of paper taped to the back: DO NOT USE.',
    }),
    height: score('How high is the seat set?', ['Sunk to the floor, the gas lift has failed', 'Low', 'Ordinary', 'Cranked right up']),
    arms: choice('What are the armrests like?', {
      none: 'No arms.',
      loop: 'Thin black plastic loop arms.',
      padded: 'T-shaped arms with padded tops.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const leather = a.grade === 'executive';
    const cloth = s.material(a.grade === 'mesh' ? '#2a2c30' : HEX[a.colour], { roughness: leather ? 0.38 : 0.95 });
    const black = s.material('#25272a', { roughness: 0.55 });
    const chromed = leather || a.grade === 'secretary' || a.grade === 'drafting';
    const metal = s.material(chromed ? '#d3d7d9' : '#2c2e31', { metalness: chromed ? 0.55 : 0.1, roughness: chromed ? 0.28 : 0.55 });
    const tape = s.material('#aeb3b5', { metalness: 0.3, roughness: 0.5 });
    const foam = s.material('#e3c66a');
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const bar = (parent: THREE.Object3D, from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, d.length(), 10), material, p.add(q).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return mesh;
    };

    const whole = new THREE.Group();
    const base = new THREE.Group();
    const upper = new THREE.Group();
    whole.add(base, upper);
    s.root.add(whole);

    const tall = a.grade === 'drafting';
    const seatY = (tall ? 0.7 : 0.4) + a.height * (tall ? 0.12 : 0.14);
    const broken = a.grade === 'handmedown';

    // Five-star base on twin-wheel castors.
    const reach = leather ? 0.34 : 0.3;
    const spin = random() * Math.PI;
    const lostCastor = broken ? Math.floor(random() * 5) : -1;
    for (let i = 0; i < 5; i++) {
      const angle = spin + i * Math.PI * 2 / 5;
      const x = Math.sin(angle), z = Math.cos(angle);
      bar(base, [0, 0.1, 0], [x * reach, 0.075, z * reach], 0.022, metal).scale.set(1.25, 1, 0.75);
      if (i === lostCastor) continue;
      const swivel = angle + (random() - 0.5) * 2.4;
      add(base, new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), black, [x * reach, 0.06, z * reach]);
      for (const side of [-1, 1]) {
        const wheel = add(base, new THREE.CylinderGeometry(0.028, 0.028, 0.018, 14), black, [x * reach + Math.cos(swivel) * side * 0.013, 0.028, z * reach - Math.sin(swivel) * side * 0.013]);
        wheel.rotation.set(0, swivel, Math.PI / 2);
      }
    }
    add(base, new THREE.CylinderGeometry(0.045, 0.05, 0.07, 16), metal, [0, 0.105, 0]);
    add(base, new THREE.CylinderGeometry(0.03, 0.03, Math.max(0.05, seatY - 0.3), 14), black, [0, 0.13 + (seatY - 0.3) / 2, 0]);
    add(base, new THREE.CylinderGeometry(0.019, 0.019, seatY - 0.16, 12), s.material('#cfd3d5', { metalness: 0.6, roughness: 0.25 }), [0, 0.12 + (seatY - 0.16) / 2, 0]);
    if (tall) {
      const ring = add(base, new THREE.TorusGeometry(0.22, 0.012, 8, 40), metal, [0, 0.32, 0]);
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) bar(base, [0, 0.32, 0], [Math.sin(i * 2.094) * 0.22, 0.32, Math.cos(i * 2.094) * 0.22], 0.008, metal);
    }

    // Seat, mechanism and levers.
    const seatW = leather ? 0.54 : a.grade === 'secretary' || tall ? 0.42 : 0.48;
    const seatD = leather ? 0.5 : a.grade === 'secretary' || tall ? 0.4 : 0.46;
    const seatT = leather ? 0.12 : 0.075;
    upper.position.y = seatY;
    add(upper, new THREE.BoxGeometry(0.2, 0.05, 0.24), black, [0, -seatT / 2 - 0.035, 0]);
    add(upper, new THREE.BoxGeometry(seatW * 0.9, 0.02, seatD * 0.9), black, [0, -seatT / 2 - 0.005, 0]);
    add(upper, cushion(seatW, seatD, seatT, 0.08), cloth, [0, 0, 0]);
    bar(upper, [0.08, -seatT / 2 - 0.035, 0.03], [seatW / 2 + 0.03, -seatT / 2 - 0.03, 0.05], 0.007, black);
    add(upper, new THREE.BoxGeometry(0.05, 0.012, 0.03), black, [seatW / 2 + 0.04, -seatT / 2 - 0.03, 0.05]);
    if (a.grade === 'mesh') { bar(upper, [-0.08, -seatT / 2 - 0.035, 0.0], [-seatW / 2 - 0.03, -seatT / 2 - 0.03, -0.02], 0.007, black); add(upper, new THREE.BoxGeometry(0.05, 0.012, 0.03), black, [-seatW / 2 - 0.04, -seatT / 2 - 0.03, -0.02]); }

    // The back, on its own hinge so it can recline or loll.
    const back = new THREE.Group();
    back.position.set(0, 0, -seatD / 2 + 0.02);
    upper.add(back);
    const backH = leather ? 0.72 : a.grade === 'mesh' ? 0.58 : a.grade === 'secretary' || tall ? 0.22 : 0.42;
    const backW = leather ? 0.52 : a.grade === 'secretary' || tall ? 0.36 : 0.44;
    const backLow = leather ? 0.03 : a.grade === 'secretary' || tall ? 0.26 : 0.16;
    const backT = leather ? 0.1 : 0.06;
    const midY = backLow + backH / 2;
    if (!leather) {
      bar(back, [0, -seatT / 2 - 0.03, 0.12], [0, -seatT / 2 - 0.03, -0.08], 0.016, metal).scale.set(1.6, 1, 0.6);
      bar(back, [0, -seatT / 2 - 0.035, -0.07], [0, midY, -0.07], 0.016, metal).scale.set(1.6, 1, 0.6);
    }
    if (a.grade === 'mesh') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#3d4046'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#1c1d20'; ctx.lineWidth = 3;
      for (let i = -128; i < 256; i += 10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 128, 128); ctx.moveTo(i, 128); ctx.lineTo(i + 128, 0); ctx.stroke(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 5);
      add(back, new THREE.PlaneGeometry(backW - 0.05, backH - 0.05), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [0, midY, -0.03]);
      const frame = new THREE.CatmullRomCurve3([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new THREE.Vector3(x * (backW / 2 - 0.02), midY + y * (backH / 2 - 0.02), -0.03)), true, 'catmullrom', 0.1);
      add(back, new THREE.TubeGeometry(frame, 48, 0.016, 8, true), black, [0, 0, 0]);
      add(back, cushion(0.26, 0.13, 0.05, 0.05).rotateX(Math.PI / 2), black, [0, backLow + backH + 0.1, -0.02]);
      bar(back, [0, backLow + backH - 0.02, -0.05], [0, backLow + backH + 0.08, -0.045], 0.012, black);
      add(back, cushion(0.3, 0.1, 0.04, 0.04).rotateX(Math.PI / 2), black, [0, backLow + 0.14, 0.0]);
    } else {
      add(back, cushion(backW, backH, backT, leather ? 0.12 : 0.08).rotateX(Math.PI / 2), cloth, [0, midY, -0.03]);
      if (leather) {
        const stud = s.material('#1a1a1c', { roughness: 0.4 });
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3 + (row % 2); col++)
          add(back, new THREE.SphereGeometry(0.012, 8, 6), stud, [(col - (2 + (row % 2)) / 2) * 0.13, backLow + 0.16 + row * 0.14, -0.03 + backT / 2]);
        add(back, cushion(backW * 0.8, 0.14, 0.07, 0.05).rotateX(Math.PI / 2), cloth, [0, backLow + backH - 0.09, 0.0]);
      } else if (a.grade !== 'secretary' && !tall) {
        add(back, cushion(backW * 0.92, backH * 0.9, 0.02, 0.07).rotateX(Math.PI / 2), black, [0, midY, -0.065]);
      }
    }
    back.rotation.x = -(a.pose === 'reclined' ? 0.5 : 0.1) - (broken ? 0.18 : 0);
    if (broken) back.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.18, 0.34, random());

    // Arms.
    const armKind = leather ? 'padded' : a.grade === 'secretary' || tall ? 'none' : a.arms === 'none' && broken ? 'loop' : a.arms;
    const armY = 0.2;
    if (armKind !== 'none') {
      const missing = broken ? (random() < 0.5 ? -1 : 1) : 0;
      for (const side of [-1, 1]) {
        if (side === missing) { add(upper, new THREE.BoxGeometry(0.03, 0.05, 0.06), black, [side * (seatW / 2 - 0.01), -0.02, 0]); continue; }
        const x = side * (seatW / 2 + 0.02);
        if (armKind === 'loop') {
          const loop = new THREE.CatmullRomCurve3([[x - side * 0.05, -seatT / 2, 0.1], [x, 0.02, 0.12], [x, armY, 0.13], [x, armY + 0.01, -0.08], [x, 0.03, -0.1], [x - side * 0.05, -seatT / 2, -0.08]].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.2);
          add(upper, new THREE.TubeGeometry(loop, 32, 0.014, 8), black, [0, 0, 0]).scale.set(1, 1, 1);
          add(upper, new THREE.BoxGeometry(0.045, 0.02, 0.22), black, [x, armY + 0.015, 0.025]);
        } else {
          bar(upper, [x - side * 0.06, -seatT / 2 - 0.01, 0], [x, -seatT / 2 - 0.01, 0], 0.014, metal);
          bar(upper, [x, -seatT / 2 - 0.01, 0], [x, armY, 0], leather ? 0.02 : 0.014, metal);
          add(upper, cushion(leather ? 0.085 : 0.06, leather ? 0.34 : 0.25, leather ? 0.055 : 0.03, 0.025), leather ? cloth : black, [x, armY + 0.02, 0.01]);
        }
      }
    }

    // Wear: tape patches and foam showing through.
    const patches = Math.round(mix(-2.6, 3, mood.wear)) + (broken ? 2 : 0);
    for (let i = 0; i < patches; i++) {
      const strip = add(upper, new THREE.BoxGeometry(mix(0.1, 0.2, random()), 0.004, 0.045), tape, [(random() - 0.5) * seatW * 0.5, seatT / 2 + 0.001, (random() - 0.2) * seatD * 0.6]);
      strip.rotation.y = random() * Math.PI;
    }
    if (broken || mood.wear > 0.75) {
      const tuft = add(upper, new THREE.IcosahedronGeometry(0.04, 1), foam, [seatW / 2 - 0.06, seatT / 2 - 0.015, seatD / 2 - 0.07]);
      tuft.scale.set(1.3, 0.5, 1);
    }

    // What was left behind.
    let balloon: THREE.Group | null = null;
    if (a.left === 'jacket') {
      const suit = s.material(mood.cheer > 0.6 ? '#7b6a4d' : '#3b4252', { roughness: 0.9 });
      const lining = s.material('#6f7a94', { roughness: 0.4 });
      const top = backLow + backH + (a.grade === 'mesh' ? 0.02 : 0);
      const jw = backW + 0.08, jh = Math.min(0.5, backH * 0.9 + 0.1);
      add(back, cushion(jw, jh, backT + 0.07, 0.07).rotateX(Math.PI / 2), suit, [0, top - jh / 2 + 0.025, -0.035]);
      add(back, new THREE.BoxGeometry(jw * 0.22, jh * 0.7, 0.01), lining, [0, top - jh * 0.35 - 0.02, -0.03 + backT / 2 + 0.036]);
      for (const side of [-1, 1]) {
        const shoulder = add(back, new THREE.SphereGeometry(0.07, 12, 8), suit, [side * (jw / 2 - 0.02), top - 0.03, -0.04]);
        shoulder.scale.set(1, 0.7, 1.1);
        bar(back, [side * (jw / 2 + 0.01), top - 0.05, -0.05], [side * (jw / 2 + 0.03 + random() * 0.03), top - Math.min(0.5, jh + 0.12), -0.07 + (random() - 0.5) * 0.06], 0.042, suit).scale.set(1, 1, 0.6);
      }
      add(back, new THREE.BoxGeometry(0.16, 0.05, 0.03), suit, [0, top + 0.02, -0.08]);
    } else if (a.left === 'files' && a.pose === 'toppled') {
      const hues = ['#d8c48a', '#c9b06e', '#e9e4d2', '#b9c7a1', '#d99a7a'];
      const n = Math.round(mix(4, 10, mood.density));
      for (let i = 0; i < n; i++) {
        const sheet = add(s.root, new THREE.BoxGeometry(0.24, 0.006, 0.31), s.material(hues[Math.floor(random() * hues.length)]), [mix(-0.15, 0.5, random()), 0.004 + i * 0.004, mix(0.1, 0.55, random())]);
        sheet.rotation.y = random() * Math.PI;
      }
    } else if (a.left === 'files') {
      const hues = ['#d8c48a', '#c9b06e', '#e9e4d2', '#b9c7a1', '#d99a7a'];
      const n = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < n; i++) {
        const folder = add(upper, new THREE.BoxGeometry(0.24, mix(0.008, 0.03, random()), 0.31), s.material(hues[Math.floor(random() * hues.length)]), [(random() - 0.5) * 0.06, seatT / 2 + 0.015 + i * 0.024, (random() - 0.5) * 0.06]);
        folder.rotation.y = (random() - 0.5) * 0.6;
        folder.rotation.z = (random() - 0.5) * 0.06;
      }
    } else if (a.left === 'bag') {
      const hide = s.material(mood.cheer > 0.5 ? '#b0562f' : '#4a3426', { roughness: 0.5 });
      add(upper, cushion(0.3, 0.14, 0.2, 0.04), hide, [0.02, seatT / 2 + 0.1, 0]).rotation.y = (random() - 0.5) * 0.7;
      const strap = add(upper, new THREE.TorusGeometry(0.09, 0.008, 6, 20, Math.PI), hide, [0.02, seatT / 2 + 0.2, 0]);
      strap.rotation.y = (random() - 0.5) * 0.5;
      add(upper, new THREE.BoxGeometry(0.04, 0.03, 0.012), s.material('#d8b65a', { metalness: 0.6, roughness: 0.3 }), [0.02, seatT / 2 + 0.15, 0.075]);
    } else if (a.left === 'cushion') {
      const bright = s.material(mood.cheer > 0.5 ? '#e8b532' : '#b24a3c');
      const pillow = add(back, cushion(0.34, 0.2, 0.1, 0.06).rotateX(Math.PI / 2), bright, [0, 0.16, 0.06]);
      pillow.rotation.x = 0.2;
    } else if (a.left === 'balloon') {
      balloon = new THREE.Group();
      const hue = ['#e23d4f', '#f2b01e', '#3f8fe0', '#44b56b'][Math.floor(random() * 4)];
      const rubber = s.material(hue, { roughness: 0.25, emissive: hue, emissiveIntensity: 0.15 });
      const sag = mood.cheer < 0.3;
      const tieX = armKind === 'none' ? 0 : seatW / 2 + 0.02, tieY = armKind === 'none' ? seatT / 2 : armY + 0.03;
      const length = sag ? 0.32 : 0.75;
      const globe = add(balloon, new THREE.SphereGeometry(0.14, 20, 14), rubber, [0, length + 0.15, 0]);
      globe.scale.set(sag ? 0.75 : 1, sag ? 0.85 : 1.18, sag ? 0.75 : 1);
      add(balloon, new THREE.ConeGeometry(0.02, 0.03, 8), rubber, [0, length, 0]);
      bar(balloon, [0, 0, 0], [0, length, 0], 0.003, s.material('#f1f1ee'));
      balloon.position.set(tieX * 0.4, tieY, 0);
            upper.add(balloon);
    } else if (a.left === 'sign') {
      const sheet = s.label('DO NOT USE', 0.26, 0.19, [0, 0, 0], '#b3261e', '#fbf8ec');
      sheet.removeFromParent();
      sheet.position.set(0, backLow + backH * 0.6, -0.03 + backT / 2 + 0.012);
      sheet.rotation.z = (random() - 0.5) * 0.2;
      back.add(sheet);
      add(back, new THREE.BoxGeometry(0.08, 0.025, 0.003), tape, [0, backLow + backH * 0.6 + 0.095, -0.03 + backT / 2 + 0.014]);
    }

    // Pose.
    const facing = a.pose === 'spun' ? (random() < 0.5 ? -1 : 1) * mix(0.9, 2.3, random()) : a.pose === 'tucked' ? (random() - 0.5) * 0.12 : a.pose === 'toppled' ? 0 : (random() - 0.5) * 0.7;
    upper.rotation.y = facing;
    if (lostCastor >= 0) whole.rotation.z = 0.04;
    if (a.pose === 'toppled') {
      whole.rotation.z = Math.PI / 2 - 0.12;
      whole.rotation.y = (random() - 0.5) * 0.8;
      if (balloon) balloon.rotation.z = -Math.PI / 2 + 0.12;
    }

    const live = a.pose === 'spun' ? mix(0.02, 0.22, mood.energy) : 0;
    return s.finish({
      update: (_dt, time) => {
        if (live) upper.rotation.y = facing + Math.sin(time * 0.9) * live;
        if (balloon && a.pose !== 'toppled' && mood.cheer >= 0.3) balloon.rotation.z = Math.sin(time * 1.3) * 0.06 * (0.4 + mood.energy);
      },
    });
  },
});
