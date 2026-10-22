import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const LEATHER = {
  oxblood: '#6e2a24',
  black: '#26221f',
  tan: '#a8703f',
  red: '#b23a2c',
  canvas: '#77775a',
  blue: '#2f4f86',
} as const;

export default defineThing({
  questions: {
    bag: choice('What kind of bag hangs from the frame?', {
      long: 'A classic long cylinder heavy bag, as tall as a torso and legs.',
      teardrop: 'A short fat teardrop bag for uppercuts, hung high.',
      water: 'A glossy round water bag like a huge rubber drop, modern and bright.',
      split: 'An old long bag that has split its seam and is leaking sand onto the floor.',
    }),
    leather: choice('What colour is the bag?', {
      oxblood: 'Deep oxblood leather, the old gym standard.',
      black: 'Black leather, hard and anonymous.',
      tan: 'Worn tan hide gone pale where the fists land.',
      red: 'Bright fight-night red vinyl.',
      canvas: 'Olive army-surplus canvas.',
      blue: 'Faded corner blue.',
    }),
    patches: choice('How has it been repaired?', {
      none: 'Not at all: one clean skin.',
      bands: 'Rings of silver duct tape wound round the middle.',
      cross: 'A cross of tape slapped over one wound.',
      mummy: 'Taped nearly from top to bottom, more tape than leather.',
      stitched: 'Hand-stitched leather patches in mismatched colours.',
    }),
    state: choice('What is the bag doing right now?', {
      still: 'Hanging dead still in an empty room.',
      swinging: 'Swung out wide on its chain from a blow just landed.',
      floor: 'Unhooked and lying on the floor, the chain hanging empty.',
    }),
    mark: choice('What is marked on the bag, if anything?', {
      nothing: 'Nothing.',
      number: 'A stencilled gym number.',
      face: 'A crude face drawn in marker to aim at.',
      name: 'A rival\'s name written across it.',
      target: 'Painted target circles where the body shots go.',
    }),
    foot: choice('What sits at the foot of the frame?', {
      bare: 'Nothing, bare steel feet.',
      sandbags: 'Sandbags slumped over the base to stop it walking.',
      plates: 'Iron weight plates stacked on the feet.',
      towel: 'A dropped towel and a pair of bag gloves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const steel = s.material('#3c4349', { metalness: 0.55, roughness: 0.5 });
    steel.color.lerp(new THREE.Color('#7a4a30'), mood.wear * 0.55);
    const chainSteel = s.material('#8d9396', { metalness: 0.8, roughness: 0.35 });
    const water = a.bag === 'water';
    const hide = s.material(water ? { oxblood: '#c2392f', black: '#2a2d33', tan: '#e08a2c', red: '#e2362c', canvas: '#5c8a4a', blue: '#2f6fd0' }[a.leather] : LEATHER[a.leather], {
      roughness: water ? 0.18 : 0.62, metalness: water ? 0.1 : 0,
    });
    const tape = s.material('#b4b8bb', { metalness: 0.35, roughness: 0.4 });
    const sand = s.material('#cdb383', { roughness: 1 });
    const dark = s.material('#161412');

    // Gallows frame: H base, upright at the back, arm reaching forward, diagonal brace.
    const armY = 2.4, postZ = -0.75, hookZ = 0.1;
    for (const x of [-0.48, 0.48]) s.box([0.08, 0.07, 1.4], [x, 0.035, -0.15], steel);
    s.box([1.04, 0.07, 0.08], [0, 0.035, postZ], steel);
    s.box([0.09, armY, 0.09], [0, armY / 2, postZ], steel);
    s.box([0.08, 0.09, hookZ - postZ + 0.18], [0, armY, (hookZ + postZ) / 2 + 0.05], steel);
    s.rod([0, armY - 0.75, postZ + 0.03], [0, armY - 0.04, postZ + 0.62], 0.028, steel);
    for (const x of [-1, 1]) s.rod([x * 0.44, 0.06, postZ], [0, 0.85, postZ], 0.024, steel);
    s.box([0.16, 0.012, 0.16], [0, 0.076, postZ], steel);
    // Eye bolt under the arm.
    const eye = s.ring(0.03, 0.008, [0, armY - 0.07, hookZ], chainSteel);
    eye.rotation.y = Math.PI / 2;

    const length = { long: 1.25, split: 1.25, teardrop: 0.78, water: 0.62 }[a.bag];
    const radius = { long: 0.2, split: 0.2, teardrop: 0.29, water: 0.3 }[a.bag];
    const chain = { long: 0.42, split: 0.42, teardrop: 0.72, water: 0.8 }[a.bag];
    const radiusAt = (t: number) => {
      if (a.bag === 'long' || a.bag === 'split') {
        const sag = a.bag === 'split' ? 1 + 0.12 * Math.max(0, 0.5 - t) - 0.1 * Math.max(0, t - 0.5) : 1 + 0.05 * (0.5 - t);
        const cap = Math.min(1, Math.sqrt(Math.max(0, t) / 0.07), Math.sqrt(Math.max(0, 1 - t) / 0.05) * 0.75 + 0.25);
        return radius * sag * cap;
      }
      const e = a.bag === 'water' ? 0.62 : 0.5;
      return Math.max(radius * Math.sin(Math.PI * t ** e) ** 0.75, t > 0.6 ? 0.055 : 0);
    };

    // The pivot sits at the hook; everything hanging is built below it.
    const pivot = new THREE.Group();
    pivot.position.set(0, armY - 0.1, hookZ);
    s.root.add(pivot);
    const bag = new THREE.Group();
    pivot.add(bag);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };
    const links = (group: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) => {
      const count = Math.max(2, Math.round(from.distanceTo(to) / 0.045));
      const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.018, 0.005, 5, 10), chainSteel, count);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(0.8, 1.35, 1);
      for (let i = 0; i < count; i++) {
        const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i % 2 ? Math.PI / 2 : 0);
        matrix.compose(from.clone().lerp(to, (i + 0.5) / count), quaternion.clone().multiply(twist), scale);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.castShadow = true;
      group.add(mesh);
    };

    const profile: [number, number][] = [];
    for (let i = 0; i <= 28; i++) profile.push([Math.max(radiusAt(i / 28), 0.0005), (i / 28) * length]);
    const top = -chain, bottom = top - length;
    into(bag, s.lathe(profile, hide, [0, bottom, 0]));
    const neck = radiusAt(0.97);
    into(bag, s.cylinder(neck * 0.9, neck, 0.012, [0, top + 0.004, 0], hide));
    const arc = (t: number, height: number, width: number, angle: number, material: THREE.Material, lift = 0.004) => {
      const geometry = new THREE.CylinderGeometry(radiusAt(Math.min(1, t + height / length / 2)) + lift, radiusAt(Math.max(0, t - height / length / 2)) + lift, height, 28, 1, true, angle - width / 2, width);
      const mesh = into(bag, s.mesh(geometry, material, [0, bottom + t * length, 0]));
      (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      return mesh;
    };
    // Top and bottom seams.
    if (!water) {
      const seam = s.material(new THREE.Color(hide.color).multiplyScalar(0.6));
      arc(0.93, 0.03, Math.PI * 2, 0, seam, 0.003);
      arc(0.08, 0.025, Math.PI * 2, 0, seam, 0.003);
      arc(0.5, length * 0.82, 0.07, Math.PI, seam, 0.003);
    } else {
      into(bag, s.cylinder(0.06, 0.07, 0.06, [0, top - 0.02, 0], dark));
      arc(0.42, 0.012, Math.PI * 2, 0, s.material('#f3f1ea'), 0.002);
    }

    // Suspension: a swivel, then straps or chains spreading to the bag's shoulders.
    const hangsFromHook = a.state !== 'floor';
    const swivelY = -0.12;
    const shoulder = water || a.bag === 'teardrop' ? 0.05 : radius * 0.8;
    const spread = water || a.bag === 'teardrop' ? 1 : 4;
    if (hangsFromHook) {
      links(pivot, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, swivelY, 0));
      into(pivot, s.cylinder(0.022, 0.022, 0.05, [0, swivelY - 0.02, 0], chainSteel, 10));
      for (let i = 0; i < spread; i++) {
        const angle = (i / spread) * Math.PI * 2 + Math.PI / 4;
        links(bag, new THREE.Vector3(0, swivelY - 0.04, 0), new THREE.Vector3(Math.sin(angle) * shoulder, top + (spread === 1 ? 0 : -0.03), Math.cos(angle) * shoulder));
      }
    } else {
      // The empty chain still hangs from the arm, the bag lies below with its straps slack.
      const drop = mix(0.5, 0.9, random());
      links(s.root, new THREE.Vector3(0, armY - 0.1, hookZ), new THREE.Vector3(0, armY - 0.1 - drop, hookZ));
      const hook = s.ring(0.035, 0.009, [0, armY - 0.14 - drop, hookZ], chainSteel, Math.PI * 1.4);
      hook.rotation.z = Math.PI * 0.8;
      for (let i = 0; i < spread; i++) {
        const angle = (i / spread) * Math.PI * 2 + Math.PI / 4;
        links(bag, new THREE.Vector3(Math.sin(angle) * shoulder, top - 0.03, Math.cos(angle) * shoulder), new THREE.Vector3(Math.sin(angle) * shoulder * 1.6, top + 0.16 + random() * 0.08, Math.cos(angle) * shoulder * 1.6));
      }
    }

    // Repairs. Wear adds tape whatever was asked.
    const extra = Math.round(mood.wear * 3 * random());
    const bandAt = (t: number) => { const band = arc(t, mix(0.045, 0.07, random()), Math.PI * 2, 0, tape); band.rotation.z = (random() - 0.5) * 0.09; band.rotation.y = random() * 6; };
    const zone = (lo: number, hi: number) => mix(lo, hi, random());
    if (a.patches === 'bands') for (let i = 0, n = 3 + Math.floor(random() * 3); i < n; i++) bandAt(zone(0.3, 0.7));
    if (a.patches === 'mummy') for (let i = 0; i < 13; i++) bandAt(0.14 + (i / 13) * 0.72 + random() * 0.02);
    if (a.patches === 'cross') {
      const angle = (random() - 0.5) * 1.2, t = zone(0.4, 0.6);
      const w = 0.18 / radius;
      arc(t, 0.055, w * 2.2, angle, tape).rotation.z = 0.05;
      arc(t, 0.34 * Math.min(1, length), w * 0.32, angle, tape, 0.006);
    }
    if (a.patches === 'stitched') {
      const scraps = ['#8a6a44', '#3d2c26', '#a13b2e', '#c9b48a'];
      for (let i = 0, n = 3 + Math.floor(random() * 3); i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random(), t = zone(0.25, 0.75);
        arc(t, zone(0.12, 0.2), zone(0.6, 1.0), angle, s.material(scraps[i % scraps.length], { roughness: 0.8 }), 0.005);
        arc(t, 0.006, 1.1, angle, s.material('#e8dfc8'), 0.008).position.y += 0.08;
      }
    }
    if (a.patches !== 'mummy') for (let i = 0; i < extra; i++) bandAt(zone(0.2, 0.8));

    // Marks painted on the front.
    if (a.mark !== 'nothing' && a.patches !== 'mummy') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const ink = a.leather === 'black' || a.leather === 'oxblood' || a.leather === 'blue' ? '#efe7d2' : '#1b1715';
      ctx.strokeStyle = ctx.fillStyle = ink;
      ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.mark === 'number') { ctx.font = 'bold 170px monospace'; ctx.fillText(String(1 + Math.floor(random() * 12)), 128, 136); }
      if (a.mark === 'name') { ctx.font = 'bold 60px sans-serif'; ctx.translate(128, 128); ctx.rotate(-0.12); ctx.fillText(['RICO', 'DUKE', 'LOPEZ', 'KID M.', 'HIM'][Math.floor(random() * 5)], 0, 0, 240); ctx.fillRect(-100, 40, 200, 8); }
      if (a.mark === 'face') {
        ctx.beginPath(); ctx.arc(128, 128, 100, 0, 7); ctx.stroke();
        for (const x of [88, 168]) { ctx.beginPath(); ctx.moveTo(x - 14, 84); ctx.lineTo(x + 14, 112); ctx.moveTo(x + 14, 84); ctx.lineTo(x - 14, 112); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(128, 200, 50, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      if (a.mark === 'target') {
        ctx.fillStyle = '#efe7d2'; ctx.beginPath(); ctx.arc(128, 128, 118, 0, 7); ctx.fill();
        ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(128, 128, 84, 0, 7); ctx.fill();
        ctx.fillStyle = '#efe7d2'; ctx.beginPath(); ctx.arc(128, 128, 50, 0, 7); ctx.fill();
        ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(128, 128, 20, 0, 7); ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const size = Math.min(0.3, length * 0.4);
      const t = a.bag === 'long' || a.bag === 'split' ? 0.68 : 0.36;
      arc(t, size, size / radiusAt(t), 0, new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.4, roughness: 0.8 }), 0.007);
    }

    // The split seam, and where the sand has gone.
    let pile: [number, number] | null = null;
    if (a.bag === 'split') {
      arc(0.3, 0.42, 0.16, 0.5, dark, 0.004);
      arc(0.3, 0.3, 0.07, 0.5, sand, 0.007);
    }

    let angle = 0;
    if (a.state === 'floor') {
      pivot.position.set(0.05 + (random() - 0.5) * 0.1, 0, 0.45);
      const peak = Math.max(...profile.map(([r]) => r));
      // Lay the bag along x, centred in front of the frame.
      bag.rotation.z = -Math.PI / 2;
      bag.rotation.x = -0.5;
      bag.position.set(0, peak * 0.97, 0);
      const inner = new THREE.Group();
      while (bag.children.length) inner.add(bag.children[0]);
      inner.position.y = chain + length / 2;
      bag.add(inner);
      pivot.rotation.y = (random() - 0.5) * 0.7;
      if (a.bag === 'split') pile = [0.1, 0.72];
    } else {
      angle = a.state === 'swinging' ? mix(0.3, 0.52, mood.energy) * (random() < 0.5 ? -1 : 1) : 0;
      pivot.rotation.z = angle;
      if (a.bag === 'split') {
        pile = [0, hookZ + 0.1];
        if (a.state === 'still') s.rod([0.09, armY - 0.1 - chain - length * 0.75, hookZ + 0.17], [0.07, 0.05, hookZ + 0.14], 0.012, sand, 0.004);
      }
    }
    if (pile) {
      s.lathe([[0.0005, 0.13], [0.06, 0.1], [0.18, 0.04], [0.3, 0.008], [0.34, 0]], sand, [pile[0], 0, pile[1]]);
      s.scatter(new THREE.SphereGeometry(1, 6, 4), sand, Array.from({ length: 26 }, () => {
        const r = 0.3 + random() * 0.3, t = random() * 6.28;
        return { at: [pile![0] + Math.cos(t) * r, 0.006, pile![1] + Math.sin(t) * r * 0.8] as const, size: 0.008 + random() * 0.018 };
      }));
    }

    // At the foot.
    if (a.foot === 'sandbags') {
      const sack = s.material('#a39373', { roughness: 1 });
      for (const [x, z, turn] of [[-0.48, -0.5, 0.1], [0.48, -0.55, -0.15], [0.48, 0.3, 0.2], ...(mood.density > 0.5 ? [[-0.48, 0.25, -0.1]] : [])]) {
        const bagMesh = s.ball([0.16, 0.075, 0.25], [x, 0.125, z], sack, 14);
        bagMesh.rotation.y = turn + (random() - 0.5) * 0.3;
      }
    }
    if (a.foot === 'plates') {
      const iron = s.material('#2b2c2e', { metalness: 0.5, roughness: 0.55 });
      for (const x of [-0.48, 0.48]) {
        const n = 1 + Math.floor(random() * 3 + mood.density * 2);
        for (let i = 0; i < n; i++) s.cylinder(0.2 - i * 0.018, 0.2 - i * 0.018, 0.035, [x + (random() - 0.5) * 0.02, 0.09 + i * 0.038, -0.5 + (random() - 0.5) * 0.03], iron, 22);
      }
    }
    if (a.foot === 'towel') {
      const cloth = s.material('#e6e0cf', { roughness: 1 });
      const heap = s.ball([0.24, 0.045, 0.16], [0.5, 0.04, 0.72], cloth, 12);
      heap.rotation.y = 0.5;
      s.ball([0.12, 0.05, 0.11], [0.42, 0.06, 0.66], cloth, 10);
      const glove = s.material('#9c2f25', { roughness: 0.5 });
      for (const [x, z, turn] of [[-0.5, 0.78, 0.4], [-0.33, 0.7, -0.9]]) {
        const fist = s.ball([0.075, 0.065, 0.1], [x, 0.065, z], glove, 12);
        fist.rotation.y = turn;
        const cuff = s.cylinder(0.05, 0.055, 0.08, [x - Math.sin(turn) * 0.1, 0.055, z - Math.cos(turn) * 0.1], glove, 12);
        cuff.rotation.set(Math.PI / 2, 0, -turn);
      }
    }

    const swing = a.state === 'swinging' ? 1 : a.state === 'still' ? 0.03 : 0;
    const base = a.state === 'swinging' ? Math.abs(angle) : 0.5;
    const sign = angle < 0 ? -1 : 1;
    const period = 2 * Math.PI * Math.sqrt((chain + length / 2) / 9.81);
    return s.finish({
      footprint: 0.95,
      update: swing ? (_dt, time) => {
        const decay = a.state === 'swinging' ? mix(0.55, 1, mood.energy) : mood.energy;
        pivot.rotation.z = sign * base * swing * decay * Math.cos((time * Math.PI * 2) / period);
        bag.rotation.y = Math.sin(time * 0.7) * 0.3 * mood.energy;
      } : undefined,
    });
  },
});
