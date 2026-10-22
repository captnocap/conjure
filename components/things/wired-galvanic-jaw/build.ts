import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { glass, labelPlane } from './lab';
import { type Surf, cord, eyeTexture, headForm, makeEye, ticks } from './head';

const SPARK = { blue: '#3fa8ff', violet: '#a04dff', green: '#4cf02a', amber: '#ff8a14' } as const;
const PLAQUE = { number: ['EXPT. No. 7'], speak: ['SPEAK'], wind: ['DO NOT WIND'], name: ['ALDINI 1803'], thanks: ['HE VOLUNTEERED'] } as const;

export default defineThing({
  questions: {
    remains: choice('How much of the face is left on the stand?', {
      jaw: 'Only the lower jawbone, hinged under a brass bite plate set with spare teeth.',
      tongue: 'Both rows of teeth, with a grey tongue lying between them.',
      half: 'A whole skull, with half the face still on it: skin, lips and one staring eye.',
    }),
    power: choice('What drives it?', {
      pile: 'A voltaic pile: a tall stack of copper and zinc discs in a rod cage.',
      frogs: 'A frog-leg battery: a rail of twitching frog legs wired in series.',
      crank: 'A hand-cranked glass-disc generator.',
      leyden: 'A foil-wrapped Leyden jar with a brass ball on top.',
      lightning: 'A lead coming down from a tall spiked lightning rod.',
    }),
    state: choice('What is the jaw doing?', {
      still: 'Nothing: strapped shut with a leather strap, waiting.',
      chattering: 'Chattering, teeth clacking as fast as the current pulses.',
      mouthing: 'Slowly mouthing a word, wide open on the vowel.',
      bitten: 'Gaping: it has bitten clean through its strap, which hangs in two pieces.',
    }),
    spark: choice('What colour are the sparks?', {
      blue: 'Cold blue-white.',
      violet: 'Violet.',
      green: 'Sickly green.',
      amber: 'Hot amber.',
    }),
    teeth: choice('What are the teeth like?', {
      full: 'A complete even set.',
      gappy: 'Gappy, several missing.',
      gold: 'Mostly there, with one gold tooth catching the light.',
      filed: 'Filed to points.',
    }),
    plaque: choice('What does the brass plaque on the base say?', {
      number: 'EXPT. No. 7',
      speak: 'SPEAK',
      wind: 'DO NOT WIND',
      name: 'ALDINI 1803',
      thanks: 'HE VOLUNTEERED',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.075, H = 0.11, D = 0.095;
    const brass = s.material('#c39a3c', { metalness: 0.85, roughness: 0.3 });
    const wood = s.material('#4f2f1c', { roughness: 0.45 });
    const iron = s.material('#35373b', { metalness: 0.6, roughness: 0.5 });
    const boneTint = new THREE.Color('#e8dcba').lerp(new THREE.Color('#a98a5a'), mood.wear * 0.5);
    const bone = new THREE.MeshStandardMaterial({ color: boneTint, roughness: 0.7 });
    const ivory = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f3ecd6').lerp(new THREE.Color('#bfa268'), mood.wear * 0.5), roughness: 0.4 });
    const flat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.7, ...options });
    const sparkColour = SPARK[a.spark];

    // Base with its plaque.
    const baseW = 0.36, baseD = 0.2, baseTop = 0.03;
    s.box([baseW, 0.012, baseD], [0, 0.006, 0], wood);
    s.box([baseW - 0.02, 0.018, baseD - 0.02], [0, 0.021, 0], wood);
    const plate = labelPlane(PLAQUE[a.plaque], 0.1, 0.022, { hand: 'caps', paper: '#c9a44a', ink: '#2b2110', wear: mood.wear * 0.5, random });
    (plate.material as THREE.MeshStandardMaterial).metalness = 0.5;
    plate.position.set(-0.07, 0.019, baseD / 2 - 0.0095); plate.rotation.x = -0.12;
    s.root.add(plate);

    // The specimen on its armature.
    const J = new THREE.Group();
    J.position.set(-0.075, baseTop, 0);
    const big = 1.28;
    J.scale.setScalar(big);
    s.root.add(J);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = J) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const cy = 0.17;
    const hinge = new THREE.Vector3(0, cy - H * 0.2, -D * 0.25);
    const tubeOf = (points: number[][], radius: number, material: THREE.Material, parent: THREE.Object3D = J) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 24, radius, 8), material), parent);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.014, 20), brass)).position.set(0, 0.007, -0.075);
    tubeOf([[0, 0, -0.075], [0, hinge.y * 0.6, -0.078], [0, hinge.y - 0.02, -0.07], [0, hinge.y, hinge.z - 0.012]], 0.0055, brass);
    tubeOf([[-W * 1.02, hinge.y, hinge.z], [-W * 0.6, hinge.y, hinge.z - 0.014], [0, hinge.y, hinge.z - 0.018], [W * 0.6, hinge.y, hinge.z - 0.014], [W * 1.02, hinge.y, hinge.z]], 0.0045, brass);
    for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), brass)).position.set(sx * W * 1.02, hinge.y, hinge.z);

    // Teeth, with whatever is wrong with them.
    const toothH = 0.016, toothW = 0.0105;
    const goldAt = Math.floor(random() * 4) + 4;
    const gold = flat('#e2b33a', { metalness: 0.95, roughness: 0.2, emissive: '#7a5a10', emissiveIntensity: 0.4 });
    const peg = new THREE.ConeGeometry(0.5, 1, 5), block = new THREE.BoxGeometry(1, 1, 1);
    const row = (path: Surf[], up: boolean, parent: THREE.Object3D, upperRow: boolean) => {
      path.forEach((point, index) => {
        if (a.teeth === 'gappy' && random() < 0.38) return;
        if (a.teeth !== 'gappy' && random() < mood.wear * 0.15) return;
        const special = a.teeth === 'gold' && upperRow && index === goldAt;
        const tooth = add(new THREE.Mesh(a.teeth === 'filed' ? peg : block, special ? gold : ivory), parent);
        tooth.position.copy(point.p);
        tooth.lookAt(point.p.clone().add(point.n));
        if (a.teeth === 'filed') { tooth.scale.set(toothW, toothH * 1.25, toothW); if (!up) tooth.rotateZ(Math.PI); }
        else tooth.scale.set(toothW * 0.9, toothH, toothW * 0.8);
      });
    };
    const archPath = (curve: THREE.Curve<THREE.Vector3>, dy: number) => Array.from({ length: 14 }, (_u, i): Surf => { const p = curve.getPointAt(mix(0.3, 0.7, i / 13)); return { p: p.clone().add(new THREE.Vector3(0, dy, 0)), n: new THREE.Vector3(p.x, 0, p.z).normalize() }; });

    // Lower jaw on its hinge.
    const jaw = add(new THREE.Group());
    jaw.position.copy(hinge);
    const chinY = -H * 1.02 - hinge.y + cy, backY = -H * 0.72 - hinge.y + cy;
    const thick = 0.0115;
    const arch = new THREE.CatmullRomCurve3([[-W * 0.9, 0, 0], [-W * 0.86, backY, -D * 0.05], [-W * 0.62, chinY + 0.01, D * 0.6], [0, chinY, D * 1.04], [W * 0.62, chinY + 0.01, D * 0.6], [W * 0.86, backY, -D * 0.05], [W * 0.9, 0, 0]].map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.3);
    const mandible = add(new THREE.Mesh(new THREE.TubeGeometry(arch, 48, thick, 8), bone), jaw);
    mandible.scale.y = 1;
    for (const sx of [-1, 1]) { const ramus = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, -backY * 0.9, 0.03), bone), jaw); ramus.position.set(sx * W * 0.88, backY * 0.5, -D * 0.02); }
    add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), bone), jaw).position.set(0, chinY - 0.002, D * 1.0);
    row(archPath(arch, thick + toothH * 0.4), true, jaw, false);

    // Upper jaw, palate and tongue.
    const upperY = cy - H * 0.58;
    let tongue: THREE.Mesh | null = null;
    const eyes: ReturnType<typeof makeEye>[] = [];
    if (a.remains !== 'half') {
      const upperStuff = a.remains === 'jaw' ? brass : bone;
      const upper = new THREE.CatmullRomCurve3([[-W * 0.82, upperY + 0.012, -D * 0.2], [-W * 0.62, upperY, D * 0.55], [0, upperY, D * 0.98], [W * 0.62, upperY, D * 0.55], [W * 0.82, upperY + 0.012, -D * 0.2]].map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.3);
      add(new THREE.Mesh(new THREE.TubeGeometry(upper, 40, 0.0105, 8), upperStuff));
      const palate = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), upperStuff));
      palate.scale.set(W * 0.66, 0.018, D * 0.72); palate.position.set(0, upperY, D * 0.26);
      palate.visible = a.remains === 'tongue';
      row(archPath(upper, -0.0105 - toothH * 0.4), false, J, true);
      for (const sx of [-1, 1]) tubeOf([[sx * W * 0.82, upperY + 0.012, -D * 0.2], [sx * W * 0.95, upperY + 0.04, -D * 0.22], [sx * W * 1.0, hinge.y, hinge.z]], 0.003, brass);
    }
    if (a.remains === 'tongue') {
      tongue = add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), flat(new THREE.Color('#b58a8e').lerp(new THREE.Color('#77707a'), mood.wear * 0.6), { roughness: 0.45 })), jaw);
      tongue.scale.set(W * 0.4, 0.011, D * 0.56);
      tongue.position.set(0, chinY + thick + 0.012, D * 0.5);
    }
    if (a.remains === 'half') {
      const side = random() < 0.5 ? 1 : -1;
      const head = headForm({ w: W * 1.14, h: H * 0.96, d: D * 1.05, jaw: 0.3, brow: 0.7, nose: 0.55, socket: 0.9, cheek: 0.8, chin: 0, lips: 0.2, muzzle: 0.14 });
      const skull = add(new THREE.Group());
      skull.position.y = cy;
      const cut = 2.2;
      const holes = (x: number, y: number, az: number) => Math.abs(az) < 1.5 && (((x + side * 0.36) / 0.19) ** 2 + ((y - 0.06) / 0.15) ** 2 < 1 || (x / (0.07 + Math.max(0, -(y + 0.2)) * 0.5)) ** 2 + ((y + 0.2) / 0.12) ** 2 < 1);
      add(new THREE.Mesh(head.grid({ nu: 96, nv: 60, bottom: () => cut, skip: holes }), bone), skull);
      skull.add(new THREE.Mesh(head.grid({ nu: 48, nv: 24, bottom: () => cut, lift: -0.006 }), flat('#2a1c12', { side: THREE.BackSide, roughness: 1 })));
      add(cord(Array.from({ length: 18 }, (_u, i) => { const ang = (i / 18) * Math.PI * 2; return head.face(-side * 0.36 + Math.cos(ang) * 0.2, 0.06 + Math.sin(ang) * 0.16, 0.001); }), 0.005, bone, 0, true), skull);
      const upperPath = Array.from({ length: 14 }, (_u, i) => { const point = head.surf(mix(-0.8, 0.8, i / 13), cut + 0.04, -0.003); point.p.y -= toothH * 0.3; return point; });
      row(upperPath, false, skull, true);
      // The half that still has its skin.
      const fleshTone = new THREE.Color('#b9bd9c').lerp(new THREE.Color('#7f8468'), mood.wear * 0.6);
      const flesh = flat(fleshTone, { roughness: 0.65, side: THREE.DoubleSide });
      const jag = Array.from({ length: 16 }, () => random());
      const az: [number, number] = side > 0 ? [-0.06, 1.75] : [-1.75, 0.06];
      const ragged = (value: number) => jag[Math.floor(Math.abs(value) * 8) % 16];
      add(new THREE.Mesh(head.grid({ az, nu: 44, nv: 36, lift: 0.0045, top: (v) => 0.72 + ragged(v) * 0.16, bottom: (v) => 2.16 + ragged(v + 1) * 0.07 }), flesh), skull);
      const raw = flat('#7a1f26', { roughness: 0.5 });
      add(cord(Array.from({ length: 14 }, (_u, i) => head.surf(-side * 0.06 + (i % 2 ? 0.03 : -0.02) * side, mix(0.8, 2.2, i / 13), 0.004)), 0.0032, raw), skull);
      add(cord(Array.from({ length: 12 }, (_u, i) => { const v = mix(0, 1.75, i / 11) * side; return head.surf(v, 0.72 + ragged(v) * 0.16, 0.004); }), 0.0028, raw), skull);
      const spot = head.face(side * 0.36, 0.06);
      const eye = makeEye(0.0165, eyeTexture('round', '#cfe0ea', '#6f8fa6', mix(0.3, 1, mood.energy), random), flat(fleshTone.clone().multiplyScalar(0.88)), a.state === 'still' ? 0.4 : 0.92, 0.25);
      eye.group.position.copy(spot.p).addScaledVector(spot.n, -0.006);
      eye.group.rotation.y = side * 0.15;
      add(eye.group, skull); eyes.push(eye);
      add(cord([0.15, 0.3, 0.45, 0.56].map((x, i) => head.face(side * x, 0.25 + (a.state === 'still' ? 0 : 0.05 * (1 - i / 3)), 0.007)), 0.0045, flat('#2a2420')), skull);
      add(cord([0.0, 0.1, 0.2, 0.3].map((x) => head.face(side * x, -0.5 - x * 0.1, 0.007)), 0.0052, flat('#6f4a52', { roughness: 0.5 })), skull);
      for (const sx of [-1, 1]) tubeOf([[sx * W * 0.97, cy - H * 0.05, hinge.z + 0.006], [sx * W * 1.02, hinge.y, hinge.z]], 0.004, brass);
    }

    // Strap: holding the jaw shut, or bitten through.
    const leather = flat('#5a3520', { roughness: 0.8, side: THREE.DoubleSide });
    const dangling: THREE.Object3D[] = [];
    const topY = a.remains === 'half' ? cy + H * 1.0 : a.remains === 'tongue' ? upperY + 0.022 : hinge.y + 0.012;
    if (a.state === 'still') {
      const ring = Array.from({ length: 5 }, (_u, i) => i);
      const zc = D * 0.45;
      const loop = new THREE.CatmullRomCurve3([[0, chinY + hinge.y - thick - 0.004, zc], [W * 1.0, (chinY + hinge.y + topY) / 2, zc * 0.8], [0, topY + 0.004, a.remains === 'half' ? 0 : hinge.z + 0.02], [-W * 1.0, (chinY + hinge.y + topY) / 2, zc * 0.8]].map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'catmullrom', 0.6);
      const strap = add(new THREE.Mesh(new THREE.TubeGeometry(loop, 60, 0.0042, 6, true), leather));
      strap.scale.z = 1;
      void ring;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.016), brass)).position.set(W * 1.02, (chinY + hinge.y + topY) / 2, zc * 0.8);
    } else if (a.state === 'bitten') {
      for (const sx of [-1, 1]) {
        const end = add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.075 + random() * 0.03, 0.003), leather));
        end.geometry.translate(0, -0.04, 0);
        end.position.set(sx * W * 1.04, hinge.y + 0.004, hinge.z + 0.012); end.rotation.z = sx * 0.2;
        dangling.push(end);
      }
      const scrap = add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.003, 0.018), leather), s.root);
      scrap.position.set(-0.07 + (random() - 0.5) * 0.06, baseTop + 0.002, 0.07); scrap.rotation.y = random() * 2;
    }

    // Power source.
    const P = new Sculpture(context);
    P.root.position.set(0.105, baseTop, -0.005);
    s.root.add(P.root);
    const terminals: THREE.Vector3[] = [];
    const spinners: THREE.Object3D[] = [], twitchers: THREE.Object3D[] = [];
    if (a.power === 'pile') {
      const n = 26, dh = 0.0065;
      P.cylinder(0.042, 0.045, 0.012, [0, 0.006, 0], wood);
      P.scatter(new THREE.CylinderGeometry(0.03, 0.03, dh * 0.92, 20), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.7 }), Array.from({ length: n }, (_u, i) => ({ at: [(random() - 0.5) * 0.003, 0.012 + dh * (i + 0.5), (random() - 0.5) * 0.003] as const, size: 1, color: ['#b87333', '#a9b2b6', '#3d362c'][i % 3] })));
      const topY2 = 0.012 + n * dh;
      P.cylinder(0.042, 0.042, 0.01, [0, topY2 + 0.005, 0], wood);
      for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.5; P.rod([Math.sin(ang) * 0.036, 0.01, Math.cos(ang) * 0.036], [Math.sin(ang) * 0.036, topY2 + 0.012, Math.cos(ang) * 0.036], 0.0028, glass('#cfe6dc', 0.5)); P.ball([0.005, 0.005, 0.005], [Math.sin(ang) * 0.036, topY2 + 0.014, Math.cos(ang) * 0.036], brass, 8); }
      P.ball([0.008, 0.008, 0.008], [0, topY2 + 0.016, 0], brass, 10);
      terminals.push(new THREE.Vector3(0, topY2 + 0.02, 0), new THREE.Vector3(-0.04, 0.012, 0.02));
    } else if (a.power === 'frogs') {
      for (const sx of [-1, 1]) P.rod([sx * 0.06, 0, -0.02], [sx * 0.06, 0.15, -0.02], 0.005, wood);
      P.rod([-0.066, 0.146, -0.02], [0.066, 0.146, -0.02], 0.0022, brass);
      const frog = flat(new THREE.Color('#9db86a').lerp(new THREE.Color('#8a8a6a'), mood.wear * 0.6), { roughness: 0.5 });
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Group();
        leg.position.set(-0.045 + i * 0.03, 0.146, -0.02);
        const part = (geometry: THREE.BufferGeometry, y: number, z: number, rx: number) => { const mesh = new THREE.Mesh(geometry, frog); mesh.position.set(0, y, z); mesh.rotation.x = rx; mesh.castShadow = true; leg.add(mesh); };
        part(new THREE.CapsuleGeometry(0.0075, 0.03, 4, 8), -0.026, 0.004, 0.25);
        part(new THREE.CapsuleGeometry(0.005, 0.032, 4, 8), -0.066, 0.004, -0.3);
        part(new THREE.BoxGeometry(0.014, 0.003, 0.03), -0.09, 0.012, 0.5);
        leg.rotation.x = (random() - 0.5) * 0.3;
        P.root.add(leg); twitchers.push(leg);
        if (i < 3) P.tube([[-0.045 + i * 0.03, 0.06, -0.016], [-0.03 + i * 0.03, 0.045, -0.01], [-0.015 + i * 0.03, 0.13, -0.018]], 0.0009, brass);
      }
      terminals.push(new THREE.Vector3(-0.06, 0.14, -0.02), new THREE.Vector3(0.045, 0.06, -0.012));
    } else if (a.power === 'crank') {
      for (const sz of [-1, 1]) { P.box([0.014, 0.15, 0.012], [0, 0.075, sz * 0.022], wood); }
      P.box([0.08, 0.012, 0.07], [0, 0.006, 0], wood);
      const wheel = new THREE.Group();
      wheel.position.set(0, 0.125, 0);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.004, 40), glass('#d6efe6', 0.3)); disc.rotation.x = Math.PI / 2; wheel.add(disc);
      const rimGlass = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.0022, 6, 40), new THREE.MeshStandardMaterial({ color: '#bfe0d2', roughness: 0.15 })); rimGlass.castShadow = true; wheel.add(rimGlass);
      const foil = new THREE.MeshStandardMaterial({ color: '#d9dde0', metalness: 0.9, roughness: 0.3 });
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2; const sector = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.0052), foil); sector.position.set(Math.cos(ang) * 0.05, Math.sin(ang) * 0.05, 0); sector.rotation.z = ang + Math.PI / 2; sector.castShadow = true; wheel.add(sector); }
      P.root.add(wheel); spinners.push(wheel);
      P.rod([0, 0.125, -0.03], [0, 0.125, 0.045], 0.003, iron);
      P.rod([0, 0.125, 0.045], [0.03, 0.105, 0.045], 0.003, iron);
      P.rod([0.03, 0.105, 0.045], [0.03, 0.105, 0.07], 0.005, wood);
      for (const sx of [-1, 1]) { P.rod([sx * 0.075, 0.012, 0], [sx * 0.075, 0.125, 0], 0.0025, brass); P.ball([0.009, 0.009, 0.009], [sx * 0.075, 0.13, 0], brass, 10); terminals.push(new THREE.Vector3(sx * 0.075, 0.13, 0)); }
      terminals.reverse();
    } else if (a.power === 'leyden') {
      P.lathe([[0, 0], [0.04, 0], [0.04, 0.1], [0.03, 0.115], [0.03, 0.125]], glass('#d6efe6', 0.25));
      P.cylinder(0.0405, 0.0405, 0.07, [0, 0.036, 0], new THREE.MeshStandardMaterial({ color: '#c9ccc6', metalness: 0.85, roughness: 0.38 }), 28);
      P.cylinder(0.032, 0.032, 0.012, [0, 0.128, 0], wood);
      P.rod([0, 0.03, 0], [0, 0.185, 0], 0.003, brass);
      P.ball([0.014, 0.014, 0.014], [0, 0.195, 0], brass, 14);
      terminals.push(new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(-0.04, 0.03, 0.01));
    } else {
      P.box([0.06, 0.014, 0.06], [0, 0.007, 0], wood);
      P.rod([0, 0.01, 0], [0, 0.42, 0], 0.004, iron);
      P.mesh(new THREE.ConeGeometry(0.006, 0.05, 6), iron, [0, 0.445, 0]);
      for (let i = 0; i < 3; i++) { const spike = P.mesh(new THREE.ConeGeometry(0.003, 0.03, 5), iron, [Math.sin(i * 2.1) * 0.012, 0.425, Math.cos(i * 2.1) * 0.012]); spike.rotation.set(Math.cos(i * 2.1) * 0.6, 0, -Math.sin(i * 2.1) * 0.6); }
      P.ball([0.014, 0.014, 0.014], [0, 0.4, 0], brass, 12);
      for (const y of [0.1, 0.25]) P.lathe([[0.004, 0], [0.016, 0.004], [0.008, 0.012], [0.016, 0.018], [0.004, 0.024]], P.material('#efe9da', { roughness: 0.25 }), [0, y, 0]);
      // A knife switch at its foot.
      P.box([0.02, 0.006, 0.05], [0.0, 0.017, 0.045], P.material('#efe9da', { roughness: 0.3 }));
      P.rod([0, 0.02, 0.026], [0, 0.05, 0.06], 0.002, brass); P.ball([0.006, 0.006, 0.006], [0, 0.052, 0.062], P.material('#1b1b1e'), 8);
      terminals.push(new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(-0.012, 0.02, 0.066));
    }

    // Leads from the source to clips on the jaw, and the sparks at each end.
    const clipT = [0.2, 0.8].map((t) => arch.getPointAt(t).add(hinge).multiplyScalar(big).add(J.position));
    const leadTones = ['#8a2f1f', '#274a2f'];
    const sparks: THREE.Mesh[] = [], bolts: THREE.Mesh[] = [];
    const sparkAt = (at: THREE.Vector3, size: number) => {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(size), new THREE.MeshBasicMaterial({ color: sparkColour }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 2.6, 10, 8), new THREE.MeshBasicMaterial({ color: sparkColour, transparent: true, opacity: 0.3, depthWrite: false }));
      core.position.copy(at); halo.position.copy(at);
      s.root.add(core, halo); sparks.push(core, halo);
      for (let i = 0; i < 3; i++) {
        const dir = new THREE.Vector3(random() - 0.5, random() * 0.8 + 0.1, random() - 0.2).normalize();
        const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
        const bolt = Array.from({ length: 6 }, (_u, j) => at.clone().addScaledVector(dir, j * size * 1.1).addScaledVector(side, j && j < 5 ? (j % 2 ? 1 : -1) * size * 0.7 : 0).add(new THREE.Vector3(0, j % 2 ? size * 0.4 : 0, 0)));
        const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bolt, false, 'catmullrom', 0), 12, size * 0.14, 4), core.material);
        s.root.add(arc); bolts.push(arc);
      }
    };
    terminals.forEach((terminal, index) => {
      const from = terminal.clone().add(P.root.position);
      const to = clipT[index === 0 ? 1 : 0];
      const sag = Math.max(baseTop + 0.012, Math.min(from.y, to.y) - 0.05);
      const mid = from.clone().lerp(to, 0.5); mid.y = sag; mid.z += 0.05 + index * 0.02;
      const points = [from, from.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -0.01, 0.02)), mid, to.clone().lerp(mid, 0.4).add(new THREE.Vector3(0, -0.012, 0.01)), to];
      s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.0022, 6), flat(leadTones[index], { roughness: 0.6 }));
      const clip = s.box([0.012, 0.016, 0.02], [to.x, to.y, to.z], brass);
      clip.rotation.y = 0.3;
      sparkAt(to.clone().add(new THREE.Vector3(Math.sign(to.x - J.position.x) * 0.014, 0.012, 0.01)), a.state === 'still' ? 0.007 : 0.012);
      if (index === 0) sparkAt(from.clone().add(new THREE.Vector3(0, 0.014, 0)), a.state === 'still' ? 0.006 : 0.009);
    });

    const open = { still: 0.02, chattering: 0.2, mouthing: 0.34, bitten: 0.6 }[a.state];
    jaw.rotation.x = open;
    const energy = mix(0.25, 1, mood.energy);
    return s.finish({
      update(dt, time) {
        if (a.state === 'chattering') jaw.rotation.x = 0.03 + Math.abs(Math.sin(time * mix(7, 22, mood.energy))) * 0.24;
        else if (a.state === 'mouthing') jaw.rotation.x = 0.06 + (0.5 + 0.5 * Math.sin(time * mix(0.9, 2.4, mood.energy))) * 0.34 * (0.6 + 0.4 * Math.sin(time * 0.37));
        else if (a.state === 'bitten') jaw.rotation.x = open + Math.sin(time * 13) * 0.02 * energy;
        if (tongue) tongue.position.z = D * 0.5 + Math.sin(time * 2.1) * 0.006 * energy;
        sparks.forEach((spark, i) => { const k = a.state === 'still' ? 0.25 : Math.max(0.1, Math.sin(time * 31 + i * 1.7) * Math.sin(time * 9.3 + i)); spark.scale.setScalar(0.4 + k * 1.3 * energy); spark.rotation.y += dt * 9; });
        bolts.forEach((bolt, i) => { bolt.visible = a.state === 'still' ? Math.sin(time * 3 + i * 2.2) > 0.93 : Math.sin(time * 27 + i * 2.2) > -0.2 * energy; });
        for (const wheel of spinners) wheel.rotation.z -= dt * mix(0.6, 9, mood.energy);
        twitchers.forEach((leg, i) => { leg.rotation.x = Math.max(0, Math.sin(time * mix(3, 14, mood.energy) + i * 1.3)) ** 6 * 0.5 * energy; });
        dangling.forEach((end, i) => { end.rotation.x = Math.sin(time * 2.2 + i) * 0.12 * energy; });
        for (const eye of eyes) eye.globe.rotation.y = Math.sin(time * 1.3) * 0.35 * energy;
      },
    });
  },
});
