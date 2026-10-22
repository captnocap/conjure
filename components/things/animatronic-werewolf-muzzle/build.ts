import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { blob, noise3, smooth, taperTube } from './fx';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0), Z = V(0, 0, 1);

export default defineThing({
  questions: {
    stage: choice('Which stage of the transformation is this head?', {
      'mostly-man': 'Mostly man: a human face with a pushed-out mouth, skin showing through thin hair, small pointed ears.',
      halfway: 'Halfway: a short muzzle, heavy brow, ears climbing the skull.',
      'full-wolf': 'Full wolf: a long lupine muzzle, tall ears on top of the head, thick ruff.',
    }),
    fur: score('How much of it is furred, versus bare mechanism?', [
      'Bare underskull, servos and cables, one test patch of fur',
      'Fur down one side, exposed mechanism down the other',
      'Furred all over with one access panel still open',
    ]),
    mouth: choice('What is the mouth doing?', {
      closed: 'Closed, canines overlapping the lip.',
      snarl: 'A snarl: lip curled off the gums, muzzle wrinkled, jaw a little open.',
      howl: 'Head thrown back in a full open howl.',
    }),
    teeth: choice('How finished are the teeth and tongue?', {
      acrylic: 'Raw white dental acrylic, unpainted, with a pale blank tongue.',
      painted: 'Fully painted: yellowed ivory fangs, dark gums and a wet red tongue.',
      steel: 'Polished steel test teeth and no tongue yet.',
      'half-fitted': 'Only half the teeth are in; the rest lie on the board.',
    }),
    eyes: choice('What are the eyes?', {
      'glass-amber': 'Glass eyes, amber with round black pupils.',
      'led-red': 'Red LEDs that glow.',
      empty: 'Empty sockets with a bare metal eye ring.',
      'one-each': 'One finished amber eye, one empty socket waiting.',
    }),
    ears: choice('How are the ears set?', {
      pricked: 'Both pricked up and alert.',
      flat: 'Laid flat back in anger.',
      cocked: 'One up, one flopped out sideways.',
      unfitted: 'Not fitted yet: only the brass pivot posts.',
    }),
    coat: choice('What colour is the fur?', {
      timber: 'Grey timber wolf with a pale muzzle.',
      black: 'Jet black.',
      russet: 'Russet brown, a bit foxy.',
      white: 'Dirty arctic white.',
      silver: 'Old silver with dark tips.',
    }),
    skull: choice('What is the underskull made of?', {
      fibreglass: 'Amber-yellow fibreglass resin.',
      aluminium: 'Riveted aluminium plate.',
      plastic: 'White vacuum-formed plastic with pencil marks.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const m = { 'mostly-man': 0.12, halfway: 0.55, 'full-wolf': 1 }[a.stage];
    const RX = mix(0.078, 0.083, m), RY = mix(0.102, 0.086, m), RZ = mix(0.094, 0.108, m);
    const ML = mix(0.035, 0.115, m), MY = -0.03;
    const lift = a.mouth === 'snarl' ? 0.009 : 0;
    const seed = random() * 30;

    const furColour = new THREE.Color({ timber: '#7d7a72', black: '#26242a', russet: '#9a5630', white: '#e4dfd2', silver: '#a9adb2' }[a.coat]);
    const paleFur = furColour.clone().lerp(new THREE.Color('#efe6d2'), a.coat === 'black' ? 0.12 : 0.55);
    const darkFur = furColour.clone().multiplyScalar(a.coat === 'white' ? 0.8 : 0.55);
    const flesh = new THREE.Color('#c99578');
    const shell = new THREE.Color({ fibreglass: '#d6c27c', aluminium: '#b9bfc4', plastic: '#ecebe4' }[a.skull]);
    const palate = new THREE.Color(a.teeth === 'painted' ? '#7c2b33' : '#d9a39a');

    const thr = mix(0.92, -0.92, a.fur);
    const furOn = (d: THREE.Vector3) => smooth(-0.05, 0.05, -d.x - thr + 0.16 * noise3(d.x * 3 + seed, d.y * 3, d.z * 3));
    const raw = (d: THREE.Vector3) => {
      const p = V(d.x * RX, d.y * RY, d.z * RZ);
      const front = smooth(0, 0.45, d.z);
      const q = (d.x / 0.62) ** 2 + ((d.y + 0.1) / 0.42) ** 2;
      const g = front * Math.exp(-(q ** 2));
      p.z += ML * g;
      p.y += 0.004 * g * m;
      const ax = Math.abs(d.x);
      const brow = front * Math.exp(-(((ax - 0.34) / 0.26) ** 2) - ((d.y - 0.34) / 0.1) ** 2);
      const socket = front * Math.exp(-(((ax - 0.4) / 0.15) ** 2) - ((d.y - 0.12) / 0.11) ** 2);
      const ruff = Math.exp(-(((ax - 0.8) / 0.3) ** 2) - ((d.y + 0.3) / 0.3) ** 2);
      p.multiplyScalar(1 + 0.11 * brow - 0.1 * socket);
      p.x *= 1 + 0.14 * m * ruff;
      let clamped = false;
      const roof = MY + lift * smooth(0.06, 0.1, p.z);
      if (p.y < roof) {
        const k = smooth(0.03, 0.075, p.z);
        if (k > 0.98) clamped = true;
        p.y = mix(p.y, roof, k);
      }
      return { p, clamped };
    };
    const surface = (d: THREE.Vector3, extra = 0) => {
      const n = d.clone().normalize();
      return raw(n).p.multiplyScalar(1 + 0.055 * furOn(n) + extra);
    };
    const normalAt = (d: THREE.Vector3) => {
      const n = d.clone().normalize();
      const up = Math.abs(n.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
      const u = V(0, 0, 0).crossVectors(up, n).normalize(), v = V(0, 0, 0).crossVectors(n, u);
      const e = 0.05;
      const r = surface(n.clone().addScaledVector(u, e)).sub(surface(n.clone().addScaledVector(u, -e))).cross(surface(n.clone().addScaledVector(v, e)).sub(surface(n.clone().addScaledVector(v, -e)))).normalize();
      return r.dot(n) < 0 ? r.negate() : r;
    };

    // Materials.
    const skin = s.material('#ffffff', { vertexColors: true, roughness: a.skull === 'aluminium' ? 0.55 : 0.75, metalness: 0 });
    const steel = s.material('#aeb4b8', { metalness: 0.85, roughness: 0.3 });
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.35 });
    const black = s.material('#1c1d21', { roughness: 0.5 });
    const servoBlue = s.material('#2a4f9c', { roughness: 0.45 });
    const white = s.material('#f1efe9', { roughness: 0.5 });
    const wood = s.material('#c79d66', { roughness: 0.75 });
    const woodDark = s.material('#7a5632', { roughness: 0.8 });
    const toothMat = a.teeth === 'steel' ? s.material('#d9dde0', { metalness: 0.95, roughness: 0.15 }) : s.material(a.teeth === 'painted' ? '#e6d49a' : '#f6f3ea', { roughness: 0.3 });
    const gumMat = s.material(a.teeth === 'painted' ? '#6d2630' : a.teeth === 'steel' ? '#8d9296' : '#e2a39c', { roughness: 0.4, metalness: a.teeth === 'steel' ? 0.7 : 0 });
    const lipMat = s.material('#17151a', { roughness: 0.45 });
    const tongueMat = s.material(a.teeth === 'painted' ? '#c2323f' : '#e9b9b0', { roughness: a.teeth === 'painted' ? 0.15 : 0.6 });
    const shellFlat = s.material(shell, { roughness: 0.6, metalness: a.skull === 'aluminium' ? 0.6 : 0 });

    // Stand.
    const HY = 0.3, HS = 1.5;
    s.box([0.27, 0.02, 0.27], [0, 0.01, 0], wood);
    s.box([0.274, 0.004, 0.274], [0, 0.002, 0], woodDark);
    s.cylinder(0.04, 0.043, 0.012, [0, 0.026, -0.03], steel, 20);
    s.cylinder(0.012, 0.012, HY - 0.1, [0, 0.03 + (HY - 0.1) / 2, -0.03], steel, 12);
    s.box([0.05, 0.03, 0.05], [0, HY - 0.12, -0.03], black);

    const head = new THREE.Group();
    head.position.set(0, HY, 0);
    head.rotation.x = a.mouth === 'howl' ? -0.78 : a.mouth === 'snarl' ? -0.22 : -0.3;
    head.scale.setScalar(HS);
    head.rotation.z = (random() - 0.5) * 0.08;
    s.root.add(head);
    const put = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = head) => { o.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(o); return o; };
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at?: THREE.Vector3, parent: THREE.Object3D = head) => {
      const mesh = new THREE.Mesh(geometry, material);
      if (at) mesh.position.copy(at);
      return put(mesh, parent);
    };

    // Skull and skin in one welded surface: fur side sits proud of the shell.
    const colourAt = (d: THREE.Vector3, p: THREE.Vector3, clamped: boolean) => {
      if (clamped) return palate.clone();
      const on = furOn(d);
      const c = shell.clone();
      if (a.skull === 'fibreglass') c.offsetHSL(0, 0, noise3(p.x * 90, p.y * 90, p.z * 90) * 0.05);
      const pelt = furColour.clone();
      pelt.lerp(darkFur, smooth(0.2, 0.8, d.y) * 0.8);
      pelt.lerp(paleFur, smooth(0.0, -0.5, d.y) * smooth(0, 0.6, d.z) * 0.9);
      pelt.lerp(flesh, (1 - m) * 0.85 * smooth(-0.3, 0.3, d.z));
      pelt.offsetHSL(0, 0, noise3(p.x * 70, p.y * 70, p.z * 70) * 0.04);
      // A dark latex edge where the skin stops.
      const edge = 1 - Math.abs(on - 0.5) * 2;
      return c.lerp(pelt, on).lerp(new THREE.Color('#3a2a22'), edge * 0.5);
    };
    add(blob(88, (d) => { const r = raw(d); return r.p.multiplyScalar(1 + 0.055 * furOn(d)); }, (p, d) => colourAt(d, p, raw(d).clamped)), skin);

    // Mouth outline: half width of the flat palate at each depth, measured from the surface itself.
    const BIN = 0.006;
    const outline: number[] = [];
    let tipZ = 0;
    for (let i = 0; i < 70; i++)
      for (let j = 0; j < 70; j++) {
        const d = V(i / 69, -(j / 69), 0);
        d.z = Math.sqrt(Math.max(0, 1 - d.x * d.x - d.y * d.y));
        if (d.z <= 0.05) continue;
        const r = raw(d.normalize());
        if (!r.clamped) continue;
        const bin = Math.floor(r.p.z / BIN);
        outline[bin] = Math.max(outline[bin] ?? 0, r.p.x);
        tipZ = Math.max(tipZ, r.p.z);
      }
    const backZ = 0.078;
    const halfWidth = (z: number) => {
      const bin = Math.min(Math.floor(Math.max(z, backZ) / BIN), Math.floor(tipZ / BIN));
      for (let k = bin; k >= 0; k--) if (outline[k]) return outline[k];
      return 0.03;
    };
    // The arcade: back along one side, round the front, back along the other. u in -1..1.
    const sideLen = Math.max(0.01, tipZ - backZ - 0.012);
    const arcade = (u: number, inset: number) => {
      const au = Math.abs(u), sgn = u < 0 ? -1 : 1;
      const frontShare = 0.28;
      if (au < frontShare) {
        const t = au / frontShare;
        const z = tipZ - 0.004 - 0.008 * t * t;
        return V(sgn * halfWidth(tipZ - 0.012) * t * inset, 0, z - (1 - inset) * 0.004);
      }
      const z = tipZ - 0.012 - ((au - frontShare) / (1 - frontShare)) * sideLen;
      return V(sgn * halfWidth(z) * inset, 0, z);
    };
    const roofY = (z: number) => MY + lift * smooth(0.06, 0.1, z);

    const cone = new THREE.ConeGeometry(1, 1, 7);
    cone.translate(0, -0.5, 0); // apex at origin's far end: base at y = 0, tip at y = -1
    const fitted = () => a.teeth !== 'half-fitted' || random() < 0.5;
    const loose: number[] = [];
    const teethRow = (upper: boolean, parent: THREE.Object3D, pointAt: (u: number) => THREE.Vector3) => {
      const canine = mix(0.014, 0.034, m), n = Math.round(mix(7, 11, m));
      for (let k = 0; k < n * 2; k++) {
        const u = ((k + 0.5) / (n * 2)) * 2 - 1, au = Math.abs(u);
        const isCanine = Math.abs(au - (upper ? 0.33 : 0.26)) < 0.5 / (n * 2) + 0.001;
        const len = isCanine ? canine : au < 0.26 ? 0.007 : mix(0.011, 0.006, (au - 0.3) / 0.7);
        const r = isCanine ? 0.0062 : au < 0.26 ? 0.0032 : 0.0046;
        if (!fitted()) { loose.push(len); continue; }
        const t = add(cone, toothMat, pointAt(u), parent);
        t.scale.set(r, len, r);
        if (!upper) t.rotation.x = Math.PI;
        t.rotation.z += (upper ? 1 : -1) * Math.sign(u) * (isCanine ? 0.1 : 0.04);
      }
    };

    // Upper gums, lip and teeth.
    const lipGroup = put(new THREE.Group());
    const arcPts = (inset: number, y: (z: number) => number, n = 22) => Array.from({ length: n + 1 }, (_u, i) => { const p = arcade((i / n) * 2 - 1, inset); p.y = y(p.z); return p; });
    if (tipZ > backZ + 0.02) {
      add(taperTube(arcPts(0.9, (z) => roofY(z) - 0.001), () => 0.0045, 60, 6), gumMat);
      teethRow(true, head, (u) => { const p = arcade(u, 0.88); p.y = roofY(p.z) - 0.002; return p; });
      // The lip only exists where there is skin; on the bare side a steel lip wire stands in.
      const lipPts = arcPts(1.02, (z) => roofY(z) + (a.mouth === 'snarl' ? 0.004 : -0.004));
      const furSide = lipPts.filter((p) => furOn(surface(p).normalize()) > 0.4 || p.x < -0.004 && thr < 0.5);
      if (furSide.length > 3) add(taperTube(furSide, () => 0.0052, 50, 6), lipMat, undefined, lipGroup);
      const bare = lipPts.filter((p) => !furSide.includes(p));
      if (bare.length > 3) add(taperTube(bare, () => 0.0016, 40, 5), steel, undefined, lipGroup);
    }
    // Nose pad and snarl wrinkles.
    const noseDir = V(0, -0.12, 1).normalize();
    const nose = add(new THREE.SphereGeometry(1, 14, 10), lipMat, surface(noseDir).add(V(0, 0.004, -0.004)));
    nose.scale.set(mix(0.013, 0.02, m), mix(0.011, 0.015, m), 0.014);
    if (a.mouth === 'snarl' || a.stage !== 'mostly-man') {
      const wr = a.mouth === 'snarl' ? 4 : 2;
      for (let k = 0; k < wr; k++) {
        const y = 0.0 + k * 0.075;
        const pts = [-0.26, -0.13, 0, 0.13, 0.26].map((x) => surface(V(x, y - Math.abs(x) * 0.25, 1), 0.012));
        add(taperTube(pts, (t) => 0.0034 * Math.sin(Math.PI * t), 16, 5), new THREE.MeshStandardMaterial({ color: darkFur.clone().lerp(shell, 1 - furOn(V(0, 0, 1))), roughness: 0.8 }), undefined, lipGroup);
      }
    }

    // Lower jaw on a hinge.
    const hingeZ = 0.012, hingeY = MY - 0.012;
    const JL = Math.max(0.05, tipZ - hingeZ - 0.007);
    const jaw = put(new THREE.Group());
    jaw.position.set(0, hingeY, hingeZ);
    const jawHW = (zf: number) => halfWidth(hingeZ + zf * JL) * 0.93 * Math.sqrt(1 - Math.abs(2 * zf - 1) ** 6) * mix(1.25, 1, smooth(0, 0.45, zf));
    const jawShape = (d: THREE.Vector3) => {
      const zf = (d.z + 1) / 2;
      const p = V(d.x * Math.max(0.03, halfWidth(hingeZ + zf * JL) * 0.95) * mix(1.25, 1, smooth(0, 0.45, zf)), d.y * mix(0.03, 0.014, zf), d.z * JL * 0.5 + JL * 0.5);
      if (p.y > 0.004) p.y = 0.004;
      return p.multiplyScalar(1 + 0.05 * furOn(d));
    };
    add(blob(40, jawShape, (p, d) => (d.y > 0.2 ? palate.clone() : colourAt(V(d.x, -0.5, 0.5).normalize(), p, false))), skin, undefined, jaw);
    const jawArc = (u: number, inset: number) => {
      const au = Math.abs(u), sgn = u < 0 ? -1 : 1;
      const zf = au < 0.28 ? 1 - 0.035 - 0.06 * (au / 0.28) ** 2 : mix(0.9, 0.3, (au - 0.28) / 0.72);
      const x = au < 0.28 ? jawHW(0.9) * (au / 0.28) : jawHW(zf);
      return V(sgn * x * inset, 0.004, zf * JL);
    };
    add(taperTube(Array.from({ length: 21 }, (_u, i) => jawArc((i / 20) * 2 - 1, 0.88)), () => 0.004, 50, 6), gumMat, undefined, jaw);
    teethRow(false, jaw, (u) => jawArc(u, 0.84).add(V(0, 0.002, 0)));
    if (a.teeth !== 'steel') {
      const out = a.mouth === 'howl' ? 0.02 : 0;
      const tongue = add(blob(20, (d) => V(d.x * 0.02 * (1 - 0.3 * Math.max(0, d.z)), d.y * 0.006 + 0.004 * (1 - d.x * d.x) + Math.max(0, d.z) ** 2 * out, d.z * JL * 0.4)), tongueMat, V(0, 0.006, JL * 0.5), jaw);
      tongue.rotation.z = (random() - 0.5) * 0.2;
    }
    const jawBase = { closed: 0.03, snarl: 0.26, howl: 0.72 }[a.mouth];
    jaw.rotation.x = jawBase;
    // Hinge bolts.
    for (const side of [-1, 1]) {
      const bolt = add(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 10), steel, V(side * (halfWidth(backZ) * 1.25 + 0.012), hingeY, hingeZ + 0.004));
      bolt.rotation.z = Math.PI / 2;
    }

    // Fur: instanced tufts leaning back along the skin.
    const tuftGeometry = new THREE.ConeGeometry(1, 1, 4);
    tuftGeometry.translate(0, 0.5, 0);
    const furMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const tufts: { at: THREE.Vector3; q: THREE.Quaternion; len: number; wide: number; colour: THREE.Color }[] = [];
    const tries = Math.round(mix(900, 2600, m));
    for (let i = 0; i < tries; i++) {
      const d = V(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
      if (d.lengthSq() > 1 || d.lengthSq() < 0.01) continue;
      d.normalize();
      if (furOn(d) < 0.6) continue;
      const r = raw(d);
      if (r.clamped || (d.y < -0.8 && d.z < 0.3)) continue;
      const ax = Math.abs(d.x);
      const eye = Math.exp(-(((ax - 0.4) / 0.14) ** 2) - ((d.y - 0.12) / 0.1) ** 2) * (d.z > 0 ? 1 : 0);
      if (eye > 0.45) continue;
      const onMuzzle = smooth(0.05, 0.11, r.p.z);
      if (m < 0.3 && onMuzzle < 0.2 && d.z > 0.2 && d.y < 0.25 && random() < 0.8) continue; // man: face mostly bare skin
      const ruff = smooth(0.25, -0.3, d.z) * smooth(0.5, -0.3, d.y);
      const len = (0.012 + random() * 0.012) * mix(1, 0.45, onMuzzle) * (1 + ruff * mix(0.6, 1.3, m)) * mix(0.8, 1.15, m);
      const n = normalAt(d);
      const lean = n.clone().multiplyScalar(0.55).add(V(0, -0.25 - ruff * 0.3, -0.8)).add(V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.35)).normalize();
      if (lean.dot(n) < 0.12) lean.addScaledVector(n, 0.4).normalize();
      const colour = colourAt(d, r.p, false).lerp(furColour, (1 - m) * 0.6);
      colour.offsetHSL(0, 0, (random() - 0.5) * 0.12 + (a.coat === 'silver' ? -0.08 : 0));
      tufts.push({ at: surface(d, -0.01), q: new THREE.Quaternion().setFromUnitVectors(Y, lean), len, wide: (0.0055 + random() * 0.003) * mix(0.6, 1, m), colour });
    }
    if (tufts.length) {
      const fur = new THREE.InstancedMesh(tuftGeometry, furMaterial, tufts.length);
      const matrix = new THREE.Matrix4();
      tufts.forEach((t, i) => {
        matrix.compose(t.at, t.q, V(t.wide, t.len, t.wide * 0.6));
        fur.setMatrixAt(i, matrix);
        fur.setColorAt(i, t.colour);
      });
      fur.instanceMatrix.needsUpdate = true;
      if (fur.instanceColor) fur.instanceColor.needsUpdate = true;
      put(fur);
    }

    // Eyes.
    const eyeR = mix(0.0125, 0.014, m);
    const leds: THREE.MeshStandardMaterial[] = [];
    for (const side of [-1, 1]) {
      const d = V(side * 0.4, 0.12, 0.9).normalize();
      const at = surface(d, -0.04);
      const kind = a.eyes === 'one-each' ? (side < 0 ? 'glass-amber' : 'empty') : a.eyes;
      const eye = put(new THREE.Group());
      eye.position.copy(at);
      eye.quaternion.setFromUnitVectors(Z, V(side * 0.22, 0, 1).normalize());
      if (kind === 'glass-amber') {
        add(new THREE.SphereGeometry(eyeR, 16, 12), s.material('#f3ead8', { roughness: 0.1 }), undefined, eye);
        const iris = add(new THREE.SphereGeometry(eyeR * 0.72, 14, 10), s.material('#d98a14', { roughness: 0.08, emissive: '#7a3a00', emissiveIntensity: 0.25 }), V(0, 0, eyeR * 0.42), eye);
        iris.scale.z = 0.7;
        add(new THREE.SphereGeometry(eyeR * 0.34, 10, 8), black, V(0, 0, eyeR * 0.82), eye).scale.z = 0.5;
      } else if (kind === 'led-red') {
        const led = new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff1a10', emissiveIntensity: 1.6, roughness: 0.3 });
        leds.push(led);
        add(new THREE.SphereGeometry(eyeR, 12, 10), black, undefined, eye);
        add(new THREE.SphereGeometry(eyeR * 0.6, 12, 10), led, V(0, 0, eyeR * 0.6), eye);
      } else {
        add(new THREE.SphereGeometry(eyeR * 0.9, 12, 10), black, V(0, 0, -eyeR * 0.5), eye);
        add(new THREE.TorusGeometry(eyeR, 0.002, 6, 18), steel, V(0, 0, eyeR * 0.4), eye);
      }
      if (furOn(d) < 0.5) add(new THREE.TorusGeometry(eyeR * 1.15, 0.0026, 6, 18), brass, V(0, 0, eyeR * 0.3), eye);
      else {
        const lid = add(new THREE.SphereGeometry(eyeR * 1.14, 14, 8, 0, Math.PI * 2, 0, Math.PI * (a.mouth === 'snarl' ? 0.42 : 0.33)), lipMat, undefined, eye);
        lid.rotation.x = -0.75 + (a.mouth === 'snarl' ? 0.2 : 0);
        lid.rotation.z = -side * (a.mouth === 'snarl' ? 0.45 : 0.15);
      }
    }

    // Ears.
    const ears: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const d = V(side * mix(0.96, 0.52, m), mix(0.2, 0.78, m), -0.15).normalize();
      const at = surface(d, -0.03);
      const pivot = put(new THREE.Group());
      pivot.position.copy(at);
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.022, 8), brass, V(0, 0.008, 0), pivot);
      if (a.ears === 'unfitted') { add(new THREE.SphereGeometry(0.006, 8, 6), brass, V(0, 0.02, 0), pivot); continue; }
      const h = mix(0.034, 0.115, m), w = mix(0.018, 0.036, m);
      const shape = new THREE.Shape();
      shape.moveTo(-w, 0); shape.quadraticCurveTo(-w * 1.25, h * 0.55, w * 0.1, h); shape.quadraticCurveTo(w * 1.1, h * 0.5, w, 0); shape.closePath();
      const furred = furOn(d) > 0.5;
      if (furred) {
        const ear = add(new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 }), new THREE.MeshStandardMaterial({ color: darkFur.clone().lerp(flesh, (1 - m) * 0.7), roughness: 0.9 }), V(0, 0, -0.004), pivot);
        void ear;
        const inner = new THREE.Shape();
        inner.moveTo(-w * 0.6, h * 0.08); inner.quadraticCurveTo(-w * 0.8, h * 0.5, w * 0.08, h * 0.82); inner.quadraticCurveTo(w * 0.7, h * 0.45, w * 0.6, h * 0.08); inner.closePath();
        add(new THREE.ShapeGeometry(inner), new THREE.MeshStandardMaterial({ color: '#d79a94', roughness: 0.8 }), V(0, 0, 0.0056), pivot);
      } else {
        const pts = shape.getPoints(8).map((p) => V(p.x, p.y, 0));
        add(taperTube(pts, () => 0.0018, 40, 5, true), steel, undefined, pivot);
        add(taperTube([V(0, 0, 0), V(w * 0.05, h * 0.5, 0.004), V(w * 0.1, h, 0)], () => 0.0018, 10, 5), steel, undefined, pivot);
      }
      const up = a.ears === 'pricked' || (a.ears === 'cocked' && side < 0);
      const flat = a.ears === 'flat';
      pivot.rotation.set(flat ? -1.15 : up ? -0.12 : -0.3, side * (flat ? 0.5 : -0.25), -side * (flat ? 0.5 : up ? mix(0.5, 0.22, m) : 1.35));
      ears.push(pivot);
    }

    // Mechanism on whatever is bare.
    const bare = (d: THREE.Vector3) => furOn(d.clone().normalize()) < 0.35;
    const cables: THREE.Vector3[] = [];
    const servo = (dir: THREE.Vector3, turn: number, big = 1) => {
      const d = dir.clone().normalize();
      if (!bare(d)) return null;
      const g = put(new THREE.Group());
      const n = normalAt(d);
      g.position.copy(surface(d)).addScaledVector(n, 0.011 * big);
      g.quaternion.setFromUnitVectors(Y, n);
      g.rotateY(turn);
      add(new THREE.BoxGeometry(0.04 * big, 0.02 * big, 0.02 * big), servoBlue, undefined, g);
      add(new THREE.BoxGeometry(0.054 * big, 0.003, 0.02 * big), servoBlue, V(0, 0.004 * big, 0), g);
      add(new THREE.CylinderGeometry(0.009 * big, 0.009 * big, 0.005, 12), white, V(0.01 * big, 0.0125 * big, 0), g);
      const arm = add(new THREE.BoxGeometry(0.03 * big, 0.002, 0.006), white, V(0.02 * big, 0.016 * big, 0), g);
      arm.rotation.y = (random() - 0.5) * 1.2;
      g.updateMatrix();
      cables.push(V(-0.02 * big, 0, 0).applyMatrix4(g.matrix));
      return V(0.03 * big, 0.016 * big, 0).applyMatrix4(g.matrix);
    };
    const rodTo = (from: THREE.Vector3 | null, to: THREE.Vector3) => {
      if (!from) return;
      const dir = to.clone().sub(from);
      const rod = add(new THREE.CylinderGeometry(0.0013, 0.0013, dir.length(), 5), steel, from.clone().add(to).multiplyScalar(0.5));
      rod.quaternion.setFromUnitVectors(Y, dir.normalize());
      add(new THREE.SphereGeometry(0.0035, 6, 5), brass, to);
    };
    rodTo(servo(V(0.92, -0.05, 0.25), 0, 1.15), arcade(0.75, 1.03).setY(MY + 0.004));
    rodTo(servo(V(0.62, 0.62, 0.35), -1.2), surface(V(0.36, 0.36, 0.86), 0.03));
    rodTo(servo(V(0.75, 0.45, -0.45), 1.6), surface(V(mix(0.96, 0.52, m), mix(0.2, 0.78, m), -0.15), 0.06));
    rodTo(servo(V(0.2, 0.9, 0.2), 0), surface(V(0.12, 0.3, 0.95), 0.05));
    rodTo(servo(V(-0.9, 0.1, 0.25), Math.PI), surface(V(-0.4, 0.3, 0.86), 0.03));
    rodTo(servo(V(-0.55, 0.7, -0.3), 2), surface(V(-0.5, 0.75, -0.15), 0.06));
    rodTo(servo(V(0.85, -0.2, -0.45), 0.4, 1.3), V(halfWidth(backZ) * 1.3 + 0.012, hingeY, hingeZ + 0.004));
    // Lightening holes and rivets on bare shell.
    for (let i = 0; i < 26; i++) {
      const d = V(random() * 2 - 1, random() * 1.6 - 0.6, random() * 2 - 1).normalize();
      if (!bare(d) || raw(d).clamped) continue;
      const big = a.skull !== 'aluminium' ? random() < 0.3 : random() < 0.15;
      const hole = add(new THREE.CylinderGeometry(big ? 0.009 : 0.0028, big ? 0.009 : 0.0028, 0.003, big ? 14 : 6), big ? black : a.skull === 'plastic' ? black : steel, surface(d, 0.004));
      hole.quaternion.setFromUnitVectors(Y, normalAt(d));
    }
    // Bowden cables along the bare muzzle to the lip.
    if (bare(V(0.5, -0.1, 0.8)))
      for (let k = 0; k < 3; k++) {
        const pts = [0.0, 0.33, 0.66, 1].map((t) => surface(V(mix(0.9, 0.3, t), -0.02 + k * 0.14 - t * 0.05, mix(0.25, 1, t)), 0.03 + 0.03 * Math.sin(t * Math.PI)));
        add(taperTube(pts, () => 0.0022, 24, 6), black);
        add(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 8), brass, pts[3]).quaternion.setFromUnitVectors(Y, pts[3].clone().sub(pts[2]).normalize());
      }
    void shellFlat;

    // Wire loom: from every servo to the back of the skull, then down to a breakout box on the board.
    head.updateMatrixWorld(true);
    const gather = head.localToWorld(surface(V(0.15, -0.55, -0.8), 0.06));
    const wireColours = ['#d23a2e', '#f1c232', '#222428', '#2f6fd0', '#f0ede4', '#3fa650'];
    const boxAt = V(0.085, 0.03, -0.09);
    cables.forEach((c, i) => {
      const from = head.localToWorld(c.clone());
      const mid = from.clone().lerp(gather, 0.5).add(V(0, -0.02, -0.03));
      s.mesh(taperTube([from, mid, gather], () => 0.0016, 20, 5), s.material(wireColours[i % wireColours.length], { roughness: 0.5 }));
    });
    const strands = Math.max(3, Math.min(6, cables.length + 1));
    for (let i = 0; i < strands; i++) {
      const off = V(Math.cos(i * 1.1) * 0.005, 0, Math.sin(i * 1.1) * 0.005);
      const sag = V(0.03 + random() * 0.03, 0, -0.07 - random() * 0.04);
      s.mesh(taperTube([gather.clone().add(off), gather.clone().lerp(boxAt, 0.45).add(sag).add(off), boxAt.clone().add(V(-0.02, 0.05, -0.01)).add(off.clone().multiplyScalar(2)), boxAt.clone().add(off)], () => 0.002, 30, 5), s.material(wireColours[i % wireColours.length], { roughness: 0.5 }));
    }
    s.box([0.075, 0.03, 0.05], [boxAt.x, 0.035, boxAt.z], s.material('#8b9094', { metalness: 0.5, roughness: 0.5 })).rotation.y = 0.3;
    const pilot = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff3018', emissiveIntensity: mix(0.3, 1.8, mood.energy), roughness: 0.4 });
    s.ball([0.005, 0.005, 0.005], [boxAt.x + 0.02, 0.052, boxAt.z + 0.008], pilot, 8);
    s.cylinder(0.003, 0.003, 0.014, [boxAt.x - 0.015, 0.056, boxAt.z + 0.004], steel, 6).rotation.z = 0.4;

    // Bench litter: loose teeth, fur trimmings, screws.
    loose.slice(0, 14).forEach((len) => {
      const t = s.mesh(cone, toothMat, [-0.1 + random() * 0.06, 0.024, 0.07 + random() * 0.06]);
      t.scale.set(0.0045, len, 0.0045);
      t.rotation.set(Math.PI / 2, 0, random() * 6);
    });
    if (a.teeth === 'half-fitted') s.cylinder(0.022, 0.018, 0.03, [-0.115, 0.035, 0.03], white, 14);
    const scraps = [];
    const count = Math.round(mix(3, 34, mood.density));
    for (let i = 0; i < count; i++) scraps.push({ at: [(random() - 0.5) * 0.24, 0.022, (random() - 0.5) * 0.24] as [number, number, number], size: 0.003 + random() * 0.005, color: random() < 0.6 ? furColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.15) : new THREE.Color('#b8bcc0') });
    s.scatter(new THREE.SphereGeometry(1, 5, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), scraps);
    if (mood.density > 0.5) {
      const spare = s.box([0.04, 0.02, 0.02], [-0.09, 0.03, -0.1], servoBlue);
      spare.rotation.y = random() * 3;
      const hackle = s.box([0.05, 0.012, 0.03], [0.1, 0.026, 0.09], s.material(furColour, { roughness: 1 }));
      hackle.rotation.y = random() * 3;
    }

    const energy = mood.energy;
    const earBase = ears.map((e) => e.rotation.z);
    const phase = random() * 10;
    return s.finish({
      footprint: 0.2,
      update: (_dt, time) => {
        const t = time * mix(0.6, 3.2, energy) + phase;
        const twitch = Math.max(0, noise3(t * 1.7, 3, 1)) ** 2;
        jaw.rotation.x = jawBase + energy * (0.05 * Math.sin(t * 2.1) + 0.22 * twitch);
        lipGroup.position.y = energy * 0.004 * Math.max(0, Math.sin(t * 5.3)) * (a.mouth === 'closed' ? 0.4 : 1);
        ears.forEach((e, i) => { e.rotation.z = earBase[i] + energy * 0.18 * noise3(t * 1.3, i * 7, 2); });
        for (const led of leds) led.emissiveIntensity = 1.2 + energy * 0.8 * Math.sin(t * 6);
      },
    });
  },
});
