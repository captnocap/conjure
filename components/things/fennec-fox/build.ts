import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { sandGround, sandTone } from './sand';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type P3 = readonly [number, number, number];

const COATS = {
  cream: 'Pale cream, almost the colour of the sand it sits on.',
  sand: 'Warm sandy gold with a white bib.',
  rust: 'A rustier, redder coat with dark tail tip, more like a small red fox.',
  moon: 'Silver-white, bleached by moonlight, ghostly.',
} as const;
const COAT: Record<keyof typeof COATS, [string, string]> = {
  cream: ['#ead6ab', '#fbf4e2'], sand: ['#dcb777', '#f7ecd2'], rust: ['#c98a52', '#f1dcc0'], moon: ['#d9dcdf', '#f7f8fa'],
};

export default defineThing({
  questions: {
    pose: choice('What is the fox doing?', {
      sit: 'Sitting upright and alert, front legs straight, tail wrapped round its feet.',
      curl: 'Curled in a tight ball asleep, nose under its tail, only the ears standing up.',
      peek: 'Only its head and forepaws showing, peering out of the burrow mouth.',
      stand: 'Standing mid-step, frozen, head turned to listen.',
      lie: 'Lying like a small sphinx with its paws out in front, watching.',
    }),
    ears: choice('How are the enormous ears held?', {
      pricked: 'Both pricked straight up and forward, at full attention.',
      radar: 'Swivelled wide apart like two dishes, listening in different directions.',
      flat: 'Laid out sideways and back, wary or cowed.',
      lopsided: 'One up and one half-folded, comic and young.',
    }),
    coat: choice('What colour is its coat?', COATS),
    burrow: choice('What is the burrow mouth like?', {
      plain: 'A plain dark hole dug into the flank of a small sand mound, with a fan of fresh spoil.',
      tussock: 'A hole under a clump of dry desert grass whose roots hold the sand together.',
      rock: 'A hole sheltering under a tilted slab of dark rock.',
      root: 'A hole between the bleached roots of a long-dead bush.',
    }),
    tracks: choice('What do the pawprints in the sand show?', {
      line: 'One neat dotted line leading straight to the burrow.',
      wander: 'A wandering looping trail, a night of hunting written in the sand.',
      many: 'Several trails crossing, a busy doorway used every night.',
      none: 'None: the wind has wiped the sand clean.',
    }),
    company: choice('What else is at the burrow?', {
      nothing: 'Nothing. The fox is alone.',
      kits: 'Two kits, all ears, peeking out of the hole behind it.',
      beetle: 'A black beetle trundling past, leaving its own tiny track, watched closely.',
      bones: 'A scatter of small bleached bones and feathers from old meals.',
      sandal: 'A lost child-sized plastic sandal, half buried: people passed here.',
      lizard: 'A small lizard dangling from its mouth or lying caught at its feet.',
    }),
    eyeshine: noul('Do its eyes catch the light and shine back, as at night?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = Math.abs(mood.daylight - 0.5) * 2;
    const sand = sandTone('#dfc08a', mood.warmth);
    const [coatHex, bellyHex] = COAT[a.coat];
    const thin = mix(1, 0.8, mood.wear);
    const coat = s.material(coatHex, { roughness: 0.95 });
    const belly = s.material(bellyHex, { roughness: 0.95 });
    const dark = s.material(a.coat === 'moon' ? '#565a66' : '#3b2a22', { roughness: 0.8 });
    const black = new THREE.MeshStandardMaterial({ color: '#15110f', roughness: 0.35 });
    const pink = s.material('#e3ab93', { roughness: 0.9 });
    const eyeMaterial = a.eyeshine
      ? new THREE.MeshStandardMaterial({ color: '#f4d58a', emissive: '#ffcf6a', emissiveIntensity: mix(0.5, 2.2, night), roughness: 0.2 })
      : black;

    // Ground: a small mound with the burrow in its flank.
    const B = V(-0.15, 0, -0.17);
    const facing = V(0.5, 0, 0.87).normalize();
    const ground = sandGround({
      radius: 0.5, colour: sand, random, rows: 20, ripple: mix(0.5, 1, mood.energy),
      height: (x, z) => 0.15 * Math.exp(-((x - B.x) ** 2 + (z - B.z) ** 2) / 0.028) + 0.008 * Math.sin(x * 14 + z * 6),
    });
    s.root.add(ground.mesh);
    const on = (x: number, z: number, lift = 0): P3 => [x, ground.y(x, z) + lift, z];
    const sandMaterial = s.material(sand, { roughness: 1 });
    const spoil = s.material(sand.clone().lerp(new THREE.Color('#fff3d6'), 0.3), { roughness: 1 });

    const hole = B.clone().addScaledVector(facing, 0.115);
    hole.y = ground.y(hole.x, hole.z) + 0.03;
    const mouth = s.ball([0.075, 0.062, 0.03], [hole.x, hole.y, hole.z], new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 1 }), 18);
    mouth.rotation.y = Math.atan2(facing.x, facing.z);
    mouth.rotation.x = -0.75;
    mouth.castShadow = false;
    const apron = s.ball([0.15, 0.015, 0.11], on(hole.x + facing.x * 0.11, hole.z + facing.z * 0.11, 0.002), spoil, 16);
    apron.rotation.y = Math.atan2(facing.x, facing.z);

    // Thin leaning blades for grass, in one draw call.
    const blades = (points: { at: P3; height: number; lean: number; turn: number }[], colour: string) => {
      const geometry = new THREE.ConeGeometry(0.006, 1, 4);
      geometry.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(geometry, s.material(colour, { roughness: 1 }), points.length);
      const dummy = new THREE.Object3D();
      points.forEach((point, index) => {
        dummy.position.set(...point.at);
        dummy.rotation.set(point.lean, point.turn, 0, 'YXZ');
        dummy.scale.set(1, point.height, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.castShadow = true;
      s.root.add(mesh);
    };
    const tuft = (x: number, z: number, count: number, height: number) =>
      Array.from({ length: count }, () => ({
        at: on(x + (random() - 0.5) * 0.08, z + (random() - 0.5) * 0.08, -0.01), height: height * mix(0.5, 1.1, random()), lean: random() * 0.7, turn: random() * 6.28,
      }));
    const grass: ReturnType<typeof tuft> = [];
    const top = B.clone().addScaledVector(facing, 0.04);
    if (a.burrow === 'tussock') for (let i = 0; i < 5; i++) grass.push(...tuft(top.x + (random() - 0.5) * 0.2, top.z + (random() - 0.5) * 0.14, 14, 0.24));
    for (let i = 0; i < Math.round(mood.density * 7); i++) {
      const angle = random() * 6.28, r = 0.3 + random() * 0.12;
      grass.push(...tuft(Math.cos(angle) * r, Math.sin(angle) * r * 0.9, 7, 0.13));
    }
    if (grass.length) blades(grass, mood.wear > 0.6 ? '#a59a6a' : '#b9ad62');
    if (a.burrow === 'rock') {
      const stone = s.material('#5b5048', { roughness: 0.95, flatShading: true });
      const slab = s.mesh(new THREE.DodecahedronGeometry(0.2, 0), stone, [top.x, ground.y(top.x, top.z) + 0.02, top.z]);
      slab.scale.set(1.25, 0.32, 0.9);
      slab.rotation.set(-0.35, Math.atan2(facing.x, facing.z) + 0.3, 0.12);
      const chock = s.mesh(new THREE.DodecahedronGeometry(0.07, 0), stone, on(hole.x - 0.17, hole.z + 0.02, 0.02));
      chock.rotation.set(random(), random(), random());
    }
    if (a.burrow === 'root') {
      const wood = s.material('#cfc6b4', { roughness: 0.9 });
      const base = V(top.x, ground.y(top.x, top.z), top.z);
      for (let i = 0; i < 6; i++) {
        const angle = Math.atan2(facing.z, facing.x) + (i - 2.5) * 0.55 + (random() - 0.5) * 0.2, reach = 0.2 + random() * 0.12;
        const end = on(base.x + Math.cos(angle) * reach, base.z + Math.sin(angle) * reach, -0.01);
        s.tube([[base.x, base.y + 0.07, base.z], [base.x + Math.cos(angle) * reach * 0.5, base.y + 0.09 + random() * 0.04, base.z + Math.sin(angle) * reach * 0.5], end], 0.011, wood);
      }
      for (let i = 0; i < 4; i++) {
        const angle = random() * 6.28, lean = 0.08 + random() * 0.1, height = 0.16 + random() * 0.14;
        s.rod([base.x, base.y + 0.06, base.z], [base.x + Math.cos(angle) * lean, base.y + height, base.z + Math.sin(angle) * lean], 0.012, wood, 0.004);
      }
    }

    // The fox, modelled facing +z in its own group.
    const ear = (() => {
      const outline = (w: number, h: number) => new THREE.Shape().moveTo(-w / 2, 0).quadraticCurveTo(-w * 0.72, h * 0.5, 0, h).quadraticCurveTo(w * 0.72, h * 0.5, w / 2, 0).lineTo(-w / 2, 0);
      const outer = new THREE.ExtrudeGeometry(outline(0.062, 0.125), { depth: 0.007, bevelEnabled: false });
      outer.translate(0, 0, -0.0035);
      const inner = new THREE.ShapeGeometry(outline(0.042, 0.1));
      inner.translate(0, 0.006, 0.0045);
      const core = new THREE.ShapeGeometry(outline(0.018, 0.07));
      core.translate(0, 0.006, 0.0052);
      return { outer, inner, core };
    })();
    const fuzz = s.material(bellyHex, { roughness: 1 });

    const makeHead = (size = 1, asleep = false) => {
      const head = new THREE.Group();
      const add = (mesh: THREE.Object3D) => { head.add(mesh); return mesh; };
      add(s.ball([0.046, 0.04, 0.045], [0, 0, 0], coat, 18));
      add(s.ball([0.03, 0.022, 0.03], [0, -0.014, 0.022], belly, 14));
      const snout = add(s.cylinder(0.008, 0.021, 0.05, [0, -0.01, 0.055], coat, 12));
      snout.rotation.x = Math.PI / 2;
      add(s.ball([0.008, 0.007, 0.007], [0, -0.008, 0.081], black, 10));
      for (const side of [-1, 1]) {
        const eye = add(s.ball([0.0095, asleep ? 0.002 : 0.0095, 0.006], [side * 0.021, 0.008, 0.036], asleep ? dark : eyeMaterial, 10));
        eye.rotation.y = side * 0.45;
        add(s.ball([0.012, 0.004, 0.004], [side * 0.03, 0.002, 0.03], dark, 8)).rotation.z = side * 0.6;
      }
      const ears = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.027, 0.026, -0.004);
        for (const [geometry, material] of [[ear.outer, coat], [ear.inner, pink], [ear.core, fuzz]] as const) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          pivot.add(mesh);
        }
        const up = a.ears === 'lopsided' ? side > 0 : true;
        const spread = { pricked: 0.24, radar: 0.72, flat: 1.25, lopsided: up ? 0.2 : 1.05 }[a.ears];
        pivot.rotation.set(a.ears === 'flat' ? -0.5 : a.ears === 'lopsided' && !up ? 0.5 : -0.08, a.ears === 'radar' ? side * -0.55 : side * -0.12, -side * spread, 'YZX');
        if (mood.wear > 0.75 && side < 0) pivot.scale.y = 0.8;
        head.add(pivot);
        return pivot;
      });
      head.scale.setScalar(size);
      return { head, ears };
    };

    const fox = new THREE.Group();
    const part = (mesh: THREE.Object3D) => { fox.add(mesh); return mesh; };
    const limb = (from: THREE.Vector3, to: THREE.Vector3, rx: number, ry: number, pad: number, material: THREE.Material) => {
      const mesh = s.ball([1, 1, 1], [0, 0, 0], material, 18);
      const along = to.clone().sub(from);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(V(0, 0, 1), along.clone().normalize());
      mesh.scale.set(rx, ry, along.length() / 2 + pad);
      return part(mesh);
    };
    const leg = (from: P3, to: P3) => {
      part(s.rod(from, to, 0.014, coat, 0.01));
      part(s.ball([0.014, 0.009, 0.02], [to[0], to[1] + 0.008, to[2] + 0.008], belly, 10));
    };
    const tail = (points: P3[]) => {
      const curve = new THREE.CatmullRomCurve3(points.map((point) => V(...point)));
      const balls: THREE.Object3D[] = [];
      for (let i = 0; i < 10; i++) {
        const t = i / 9, at = curve.getPoint(t), radius = mix(0.016, 0.034, Math.sin(Math.PI * t ** 0.75)) + 0.004;
        balls.push(part(s.ball([radius, radius, radius * 1.3], [at.x, Math.max(at.y, radius * 0.8), at.z], i > 7 ? dark : coat, 12)));
      }
      return balls;
    };

    const pose = a.pose;
    let headAt = V(0, 0.285, 0.075);
    const girth = 0.058 * thin;
    if (pose === 'sit') {
      limb(V(0, 0.075, -0.08), V(0, 0.19, 0.03), girth, girth, 0.045, coat);
      limb(V(0, 0.1, 0.035), V(0, 0.2, 0.062), 0.036, 0.03, 0.02, belly);
      for (const side of [-1, 1]) {
        part(s.ball([0.042, 0.06, 0.07], [side * 0.052, 0.06, -0.06], coat, 14));
        leg([side * 0.03, 0.16, 0.06], [side * 0.032, 0, 0.085]);
        part(s.ball([0.015, 0.01, 0.034], [side * 0.058, 0.01, 0.015], belly, 10));
      }
      limb(V(0, 0.2, 0.04), headAt, 0.034, 0.034, 0.012, coat);
      tail([[0, 0.04, -0.15], [0.1, 0.035, -0.15], [0.135, 0.03, -0.03], [0.1, 0.03, 0.085]]);
    } else if (pose === 'stand') {
      headAt = V(0, 0.25, 0.18);
      limb(V(0, 0.165, -0.1), V(0, 0.175, 0.1), girth * 0.95, girth * 0.95, 0.04, coat);
      limb(V(0, 0.14, 0.02), V(0, 0.15, 0.12), 0.04, 0.03, 0.02, belly);
      const stride = (random() - 0.5) * 0.08;
      for (const side of [-1, 1]) {
        leg([side * 0.03, 0.15, 0.1], [side * 0.03, 0, 0.1 + side * stride]);
        part(s.ball([0.03, 0.05, 0.045], [side * 0.04, 0.145, -0.095], coat, 12));
        leg([side * 0.04, 0.11, -0.11], [side * 0.04, 0, -0.12 - side * stride]);
      }
      limb(V(0, 0.185, 0.11), headAt, 0.034, 0.034, 0.012, coat);
      tail([[0, 0.16, -0.16], [0.01, 0.12, -0.25], [0.03, 0.07, -0.33], [0.05, 0.045, -0.4]]);
    } else if (pose === 'lie') {
      headAt = V(0, 0.165, 0.13);
      limb(V(0, 0.062, -0.1), V(0, 0.08, 0.08), girth * 1.1, girth, 0.04, coat);
      for (const side of [-1, 1]) {
        part(s.ball([0.04, 0.05, 0.07], [side * 0.055, 0.05, -0.08], coat, 14));
        part(s.rod([side * 0.035, 0.022, 0.09], [side * 0.035, 0.014, 0.2], 0.014, coat, 0.011));
        part(s.ball([0.014, 0.01, 0.02], [side * 0.035, 0.012, 0.21], belly, 10));
      }
      limb(V(0, 0.07, 0.07), V(0, 0.1, 0.13), 0.04, 0.035, 0.015, belly);
      limb(V(0, 0.1, 0.09), headAt, 0.034, 0.034, 0.012, coat);
      tail([[0, 0.04, -0.17], [-0.08, 0.035, -0.22], [-0.15, 0.03, -0.14], [-0.16, 0.03, -0.03]]);
    } else if (pose === 'curl') {
      headAt = V(0.062, 0.052, 0.088);
      part(s.ball([0.135, 0.062 * thin, 0.11], [0, 0.058, 0], coat, 22));
      part(s.ball([0.07, 0.05, 0.06], [-0.07, 0.05, 0.03], coat, 14));
      tail([[-0.125, 0.04, -0.02], [-0.12, 0.035, 0.085], [-0.04, 0.035, 0.135], [0.045, 0.04, 0.125]]);
    } else {
      headAt = V(0, 0.05, 0.03);
      for (const side of [-1, 1]) {
        part(s.rod([side * 0.03, 0.03, -0.03], [side * 0.034, 0.008, 0.075], 0.014, coat, 0.011));
        part(s.ball([0.014, 0.01, 0.02], [side * 0.034, 0.01, 0.085], belly, 10));
      }
    }
    const { head, ears } = makeHead(1, pose === 'curl');
    head.position.copy(headAt);
    const look = pose === 'curl' ? -2.0 : pose === 'peek' ? (random() - 0.5) * 0.5 : (random() - 0.5) * 1.3;
    head.rotation.set(pose === 'curl' ? 0.25 : pose === 'peek' ? -0.1 : 0.05, look, pose === 'curl' ? 0 : (random() - 0.5) * 0.3, 'YXZ');
    fox.add(head);

    const turn = Math.atan2(facing.x, facing.z);
    const F = pose === 'peek' ? V(hole.x + facing.x * 0.02, 0, hole.z + facing.z * 0.02) : V(0.1, 0, 0.1);
    fox.position.set(F.x, pose === 'peek' ? hole.y - 0.045 : ground.y(F.x, F.z) - 0.004, F.z);
    fox.rotation.y = pose === 'peek' ? turn : turn + (random() - 0.5) * 0.9 - 0.2;
    s.root.add(fox);

    // Company.
    const ahead = V(Math.sin(fox.rotation.y), 0, Math.cos(fox.rotation.y));
    const spot = F.clone().addScaledVector(ahead, pose === 'peek' ? 0.3 : 0.27);
    let beetle: THREE.Group | null = null;
    const kitEars: THREE.Object3D[] = [];
    if (a.company === 'kits' && pose !== 'peek') {
      for (const side of [-1, 1]) {
        const kit = makeHead(0.62);
        const across = V(facing.z, 0, -facing.x).multiplyScalar(side * 0.038);
        kit.head.position.set(hole.x + across.x + facing.x * 0.035, hole.y + 0.005 + (side > 0 ? 0.012 : 0), hole.z + across.z + facing.z * 0.035);
        kit.head.rotation.set(-0.15, turn + side * 0.35 + (random() - 0.5) * 0.3, side * 0.2, 'YXZ');
        s.root.add(kit.head);
        kitEars.push(...kit.ears);
      }
    } else if (a.company === 'kits') {
      const kit = makeHead(0.62);
      kit.head.position.set(F.x + facing.z * 0.075, hole.y + 0.01, F.z - facing.x * 0.075);
      kit.head.rotation.set(-0.1, turn - 0.5, 0.2, 'YXZ');
      s.root.add(kit.head);
      kitEars.push(...kit.ears);
    } else if (a.company === 'beetle') {
      beetle = new THREE.Group();
      const shell = s.ball([0.016, 0.011, 0.021], [0, 0.011, 0], black, 12);
      const front = s.ball([0.01, 0.007, 0.009], [0, 0.009, 0.022], black, 8);
      beetle.add(shell, front);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) beetle.add(s.rod([side * 0.01, 0.01, -0.01 + i * 0.012], [side * 0.03, 0, -0.016 + i * 0.016], 0.0018, black));
      beetle.position.set(...on(spot.x, spot.z));
      beetle.rotation.y = fox.rotation.y + 1.4;
      s.root.add(beetle);
      const across = V(Math.sin(beetle.rotation.y), 0, Math.cos(beetle.rotation.y));
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material(sand.clone().multiplyScalar(0.6)), Array.from({ length: 34 }, (_unused, i) => {
        const back = 0.03 + i * 0.012, side = i % 2 ? 0.012 : -0.012;
        return { at: on(spot.x - across.x * back + across.z * side, spot.z - across.z * back - across.x * side, -0.002), size: 0.0045 };
      }));
      if (pose !== 'curl') head.rotation.y = 0;
    } else if (a.company === 'bones') {
      const bone = s.material('#f1ead8', { roughness: 0.8 });
      for (let i = 0; i < 9; i++) {
        const x = spot.x + (random() - 0.5) * 0.34, z = spot.z + (random() - 0.5) * 0.26, length = 0.03 + random() * 0.05, angle = random() * 3.14;
        const y = ground.y(x, z) + 0.006;
        s.rod([x - Math.cos(angle) * length, y, z - Math.sin(angle) * length], [x + Math.cos(angle) * length, y, z + Math.sin(angle) * length], 0.0045, bone);
        if (i < 5) s.ball([0.008, 0.006, 0.008], [x + Math.cos(angle) * length, y, z + Math.sin(angle) * length], bone, 8);
      }
      const skull = s.ball([0.02, 0.016, 0.028], on(spot.x + 0.05, spot.z - 0.03, 0.012), bone, 12);
      skull.rotation.y = random() * 3;
      const feather = s.material('#6d665e', { roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) {
        const quill = s.mesh(new THREE.PlaneGeometry(0.018, 0.08), feather, on(spot.x + (random() - 0.5) * 0.3, spot.z + (random() - 0.5) * 0.25, 0.008));
        quill.rotation.set(-Math.PI / 2 + 0.15, 0, random() * 6.28, 'ZYX');
      }
    } else if (a.company === 'sandal') {
      const plastic = s.material(mood.cheer > 0.5 ? '#2f8fd6' : '#d6473a', { roughness: 0.5 });
      const group = new THREE.Group();
      const sole = new THREE.Shape().absellipse(0, 0, 0.034, 0.075, 0, Math.PI * 2);
      const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(sole, { depth: 0.012, bevelEnabled: false }), plastic);
      slab.rotation.x = -Math.PI / 2;
      slab.castShadow = true;
      group.add(slab);
      group.add(s.ring(0.03, 0.005, [0, 0.022, 0.02], plastic, Math.PI));
      group.add(s.rod([0, 0.012, 0.055], [0, 0.05, 0.02], 0.004, plastic));
      group.position.set(...on(spot.x, spot.z, -0.004));
      group.rotation.set(0.25, random() * 6.28, 0.3);
      s.root.add(group);
    } else if (a.company === 'lizard') {
      const skin = s.material('#8b8a5c', { roughness: 0.7 });
      const lizard = new THREE.Group();
      lizard.add(s.tube([[0, 0, -0.07], [0.012, 0, -0.035], [-0.008, 0, 0], [0.004, 0, 0.03]], 0.006, skin));
      lizard.add(s.ball([0.008, 0.006, 0.012], [0.004, 0, 0.04], skin, 8));
      for (const [x, z] of [[0.014, 0.018], [-0.016, 0.014], [0.018, -0.02], [-0.012, -0.024]]) lizard.add(s.rod([0, 0, z], [x, -0.003, z + 0.006], 0.0025, skin));
      if (pose === 'curl' || pose === 'peek') {
        lizard.position.set(...on(spot.x, spot.z, 0.008));
        lizard.rotation.y = random() * 6.28;
        s.root.add(lizard);
      } else {
        lizard.position.set(0, -0.022, 0.078);
        lizard.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.4);
        head.add(lizard);
      }
    }

    // Pawprints.
    if (a.tracks !== 'none') {
      const prints: { at: P3; size: number }[] = [];
      const trails = a.tracks === 'many' ? 4 : 1;
      for (let trail = 0; trail < trails; trail++) {
        const angle = 0.35 + trail * 1.15 + random() * 0.6, reach = 0.46;
        const from = V(Math.cos(angle) * reach, 0, Math.sin(angle) * reach);
        const to = trail === 0 ? F.clone().addScaledVector(ahead, pose === 'peek' ? 0.1 : -0.02) : V(hole.x + facing.x * 0.1, 0, hole.z + facing.z * 0.1);
        const bend = a.tracks === 'wander' ? 0.22 : 0.05;
        const path = [from];
        for (let i = 1; i < 4; i++) path.push(from.clone().lerp(to, i / 4).add(V((random() - 0.5) * bend * 2, 0, (random() - 0.5) * bend * 2)));
        path.push(to);
        const curve = new THREE.CatmullRomCurve3(path);
        const steps = Math.round(curve.getLength() / 0.05);
        for (let i = 0; i < steps; i++) {
          const t = i / steps, at = curve.getPointAt(t), tangent = curve.getTangentAt(t), side = (i % 2 ? 1 : -1) * 0.014;
          const x = at.x + tangent.z * side, z = at.z - tangent.x * side;
          if (Math.hypot(x, z) < 0.45) prints.push({ at: on(x, z, -0.006), size: 0.014 });
        }
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.36), roughness: 1 }), prints).castShadow = false;
    }
    // A few pebbles.
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#8a7c6c', { flatShading: true }), Array.from({ length: 4 + Math.round(mood.density * 14) }, () => {
      const angle = random() * 6.28, r = 0.12 + random() * 0.3;
      return { at: on(Math.cos(angle) * r, Math.sin(angle) * r, 0.002), size: 0.008 + random() * 0.014 };
    }));
    void sandMaterial;

    const rest = ears.map((pivot) => pivot.rotation.z);
    const kitRest = kitEars.map((pivot) => pivot.rotation.z);
    const lively = mix(0.3, 1.6, mood.energy);
    const start = beetle ? beetle.position.clone() : null;
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        ears.forEach((pivot, index) => {
          const beat = Math.sin(time * lively * 1.3 + index * 2.1);
          pivot.rotation.z = rest[index] + (beat > 0.86 ? Math.sin(time * 26) * 0.09 : 0);
        });
        kitEars.forEach((pivot, index) => { pivot.rotation.z = kitRest[index] + Math.sin(time * lively * 3 + index) * 0.06; });
        if (pose === 'curl') fox.scale.y = 1 + Math.sin(time * 1.4) * 0.025;
        if (beetle && start) {
          const crawl = Math.sin(time * lively * 0.4) * 0.03;
          beetle.position.x = start.x + Math.sin(beetle.rotation.y) * crawl;
          beetle.position.z = start.z + Math.cos(beetle.rotation.y) * crawl;
        }
      },
    });
  },
});
