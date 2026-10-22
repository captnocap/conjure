import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

const COATS = {
  tan: 'Dust-tan canvas, the colour of the road.',
  olive: 'Faded olive drab.',
  oilskin: 'Dark waxed oilskin, nearly black.',
  pale: 'Pale undyed linen.',
  rust: 'Rust-red waxed cotton.',
} as const;
const COAT_TONE: Record<keyof typeof COATS, string> = { tan: '#b8a07a', olive: '#6f7452', oilskin: '#2e2b29', pale: '#e2dac6', rust: '#8f4a32' };

export default defineThing({
  questions: {
    doing: choice('What are they doing?', {
      watching: 'Standing with the prod planted, looking out at the herd.',
      kneeling: 'Kneeling with one hand reaching down to a stain in the grass.',
      pointing: 'Pointing at something far off.',
      walking: 'Walking the fence line, prod over the shoulder.',
      leaning: 'Leaning on the prod with both hands, worn out.',
    }),
    gaze: choice('Where are they looking?', {
      ground: 'Down at the ground.',
      horizon: 'Out at the horizon.',
      sky: 'Up at the sky.',
      back: 'Back over one shoulder.',
    }),
    mask: choice('What about the breather mask?', {
      on: 'Mask on, two filter cans over the mouth.',
      hanging: 'Mask pulled down, hanging at the chest.',
      none: 'No mask at all.',
    }),
    holding: choice('What do they carry?', {
      prod: 'A long electric prod with a forked tip.',
      rifle: 'A rifle slung across the back.',
      lantern: 'A lantern in one hand.',
      nothing: 'Nothing, hands empty.',
    }),
    coat: choice('What colour is the dust coat?', COATS),
    hat: choice('What is on their head?', {
      wide: 'A wide-brimmed hat.',
      hood: 'The coat hood pulled up.',
      cap: 'A peaked cap.',
      bare: 'Bare-headed, short hair.',
    }),
    stain: noul('Is there a green stain in the grass at their feet?'),
    height: score('How tall are they?', ['Short', 'Average', 'Tall and rangy']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const H = mix(1.5, 1.92, a.height);
    const coat = COAT_TONE[a.coat];
    const coatMat = s.material(coat, { roughness: 0.9 });
    const trouser = '#3b3a38', boots = '#2e241c';
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(random() * 5)];
    const hatTone = a.hat === 'hood' ? coat : ['#4a3b2c', '#6b5a44', '#2f2b28', '#8a7a5e'][Math.floor(random() * 4)];
    const poseOf = { watching: 'standing', kneeling: 'kneeling', pointing: 'pointing', walking: 'walking', leaning: 'standing' } as const;
    // Worn out with nothing to lean on: hands on the hips, head down.
    const pose = a.doing === 'leaning' && a.holding !== 'prod' ? 'hands-on-hips' : poseOf[a.doing];
    const gaze = a.doing === 'kneeling' ? 'down' : ({ ground: 'down', horizon: 'ahead', sky: 'up', back: 'over-shoulder' } as const)[a.gaze];
    const mirror = random() < 0.5;
    const heavy = random() < 0.3;
    const person = figure(s, {
      height: H, style: 'doll', pose, gaze, mirror,
      hair: ({ wide: 'none', hood: 'hood', cap: 'cap', bare: 'short' } as const)[a.hat],
      hairColor: hatTone, skin, top: coat, bottom: trouser, shoes: boots, sleeves: 'long',
      build: heavy ? 'heavy' : 'average',
    });
    s.root.add(person.root);
    const { joints } = person;
    const holdSide = mirror ? 'left' : 'right';
    const freeSide = mirror ? 'right' : 'left';

    // Poses the presets do not cover.
    if (a.doing === 'watching' && a.holding === 'prod') {
      joints.shoulders[holdSide].rotation.x = -0.45;
      joints.elbows[holdSide].rotation.x = -0.35;
    }
    if (a.doing === 'kneeling') {
      joints.spine.rotation.x = 0.45;
      joints.shoulders[freeSide].rotation.x = -1.3;
      joints.elbows[freeSide].rotation.x = -0.2;
      // The other hand grips the planted prod, or rests on the knee.
      joints.shoulders[holdSide].rotation.x = a.holding === 'prod' ? -0.75 : -0.35;
      joints.elbows[holdSide].rotation.x = a.holding === 'prod' ? -0.9 : -0.6;
      joints.neck.rotation.x = 0.35;
    }
    if (a.doing === 'leaning') {
      joints.spine.rotation.x = a.holding === 'prod' ? 0.3 : 0.2;
      if (a.holding === 'prod') for (const side of ['left', 'right'] as const) {
        joints.shoulders[side].rotation.x = -1.05;
        joints.elbows[side].rotation.x = -0.55;
        joints.elbows[side].rotation.y = (side === 'left' ? -1 : 1) * 0.55;
      }
      joints.neck.rotation.x = 0.3;
      joints.hips.left.rotation.z = 0.12;
    }
    if (a.doing === 'walking' && a.holding === 'prod') {
      joints.shoulders[holdSide].rotation.x = -1.4;
      joints.elbows[holdSide].rotation.x = -0.9;
    }
    person.settle();
    person.root.updateMatrixWorld(true);
    const world = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());

    // The coat: an open skirt hanging from the hips over the trousers.
    const skirtL = a.doing === 'kneeling' ? H * 0.2 : H * 0.36;
    const hipW = H * 0.075;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(hipW * 1.55, hipW * 2.5, skirtL, 18, 1, true, 0.45, Math.PI * 2 - 0.9), new THREE.MeshStandardMaterial({ color: coatMat.color, roughness: 0.9, side: THREE.DoubleSide }));
    skirt.position.y = -skirtL / 2 + H * 0.02;
    skirt.castShadow = true;
    person.pelvis.add(skirt);
    // A belt with a satchel on the hip.
    const belt = new THREE.Mesh(new THREE.TorusGeometry(hipW * 1.45, H * 0.012, 6, 20), s.material('#3a2c20', { roughness: 0.7 }));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = H * 0.03;
    person.pelvis.add(belt);
    const satchel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.07, H * 0.085, H * 0.035), s.material('#5a4330', { roughness: 0.8 }));
    satchel.position.set((mirror ? -1 : 1) * hipW * 1.55, -H * 0.03, -H * 0.01);
    satchel.castShadow = true;
    person.pelvis.add(satchel);

    // A shoulder cape, the mark of a drover's duster.
    const shoulderW = H * 0.115 * (heavy ? 1.3 : 1);
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.055, shoulderW * 1.3, H * 0.11, 18, 1, true), new THREE.MeshStandardMaterial({ color: coatMat.color, roughness: 0.9, side: THREE.DoubleSide }));
    cape.scale.z = 0.62;
    cape.position.y = H * 0.235;
    cape.castShadow = true;
    joints.spine.add(cape);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(H * 0.05, H * 0.013, 6, 16), new THREE.MeshStandardMaterial({ color: coatMat.color.clone().multiplyScalar(0.8), roughness: 0.9 }));
    collar.rotation.x = Math.PI / 2;
    collar.scale.y = 0.75;
    collar.position.y = H * 0.29;
    joints.spine.add(collar);

    // The breather mask: on the face, or hanging at the chest.
    const headR = H * 0.064;
    if (a.hat === 'wide') {
      // A wide-brimmed drover's hat: a curled brim and a pinched crown, turned on a lathe.
      const u = headR;
      const profile: [number, number][] = [[0, 0.6], [1.0, 0.6], [1.9, 0.55], [2.5, 0.68], [2.62, 0.82], [2.5, 0.8], [1.95, 0.66], [1.06, 0.7], [1.02, 1.3], [0.9, 1.68], [0.45, 1.62], [0.2, 1.5], [0, 1.52]];
      const hat = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * u, y * u)), 28), s.material(hatTone, { roughness: 0.85, side: THREE.DoubleSide }));
      hat.scale.z = 0.92;
      hat.rotation.x = -0.06;
      hat.castShadow = true;
      person.head.add(hat);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(1.04 * u, 1.04 * u, 0.16 * u, 24, 1, true), s.material('#2a221c', { roughness: 0.7 }));
      band.position.y = 0.82 * u;
      person.head.add(band);
    }
    const maskGroup = new THREE.Group();
    const rubber = s.material('#4b4f52', { roughness: 0.6 });
    const can = s.material('#2b2f31', { roughness: 0.5, metalness: 0.3 });
    const cup = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.78, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), rubber);
    cup.rotation.x = Math.PI / 2;
    cup.scale.set(1, 0.9, 0.7);
    cup.position.set(0, -headR * 0.3, headR * 0.55);
    for (const sx of [-1, 1]) {
      const filter = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.34, headR * 0.34, headR * 0.32, 12), can);
      filter.rotation.x = Math.PI / 2;
      filter.rotation.z = sx * 0.5;
      filter.position.set(sx * headR * 0.6, -headR * 0.45, headR * 0.95);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.26, headR * 0.26, headR * 0.06, 12), s.material('#8e9497', { metalness: 0.4 }));
      face.position.copy(filter.position).add(new THREE.Vector3(sx * headR * 0.06, -headR * 0.05, headR * 0.17));
      face.rotation.copy(filter.rotation);
      maskGroup.add(filter, face);
    }
    maskGroup.add(cup);
    for (const m of maskGroup.children) m.castShadow = true;
    if (a.mask === 'on') {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.0, headR * 0.05, 6, 20), rubber);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = -headR * 0.25;
      maskGroup.add(strap);
      person.head.add(maskGroup);
    } else if (a.mask === 'hanging') {
      maskGroup.position.set(0, H * 0.2, H * 0.03);
      maskGroup.rotation.x = 0.6;
      maskGroup.scale.setScalar(0.95);
      joints.spine.add(maskGroup);
      const cord = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.9, headR * 0.04, 6, 20), rubber);
      cord.rotation.x = Math.PI / 2 + 0.2;
      cord.position.set(0, H * 0.265, 0);
      joints.spine.add(cord);
    }

    // What they carry.
    const steel = s.material('#7d8488', { metalness: 0.6, roughness: 0.4 });
    const grip = s.material('#2a2724', { roughness: 0.8 });
    const tip = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#7fc4ff', emissiveIntensity: mix(0.4, 1.4, mood.energy), roughness: 0.3 });
    let spark: THREE.Mesh | null = null;
    const prod = (at: THREE.Vector3, tiltX: number, tiltZ: number, length = H * 1.05) => {
      const g = new THREE.Group();
      const shaft = s.cylinder(H * 0.008, H * 0.01, length, [0, length / 2, 0], steel, 8);
      const handle = s.box([H * 0.026, length * 0.22, H * 0.026], [0, length * 0.42, 0], grip);
      const box = s.box([H * 0.035, H * 0.05, H * 0.035], [0, length * 0.3, 0], grip);
      g.add(shaft, handle, box);
      for (const sx of [-1, 1]) g.add(s.rod([0, length, 0], [sx * H * 0.02, length + H * 0.05, 0], H * 0.004, steel));
      spark = s.ball([H * 0.012, H * 0.012, H * 0.012], [0, length + H * 0.06, 0], tip, 8);
      g.add(spark);
      g.position.copy(at);
      g.rotation.set(tiltX, 0, tiltZ);
      s.root.add(g);
      return g;
    };
    if (a.holding === 'prod') {
      const hand = world(person.hands[holdSide]);
      const sideSign = holdSide === 'left' ? 1 : -1;
      if (a.doing === 'kneeling') {
        // Planted upright beside the knee like a staff, gripped at shoulder height.
        prod(new THREE.Vector3(hand.x + sideSign * H * 0.03, 0, hand.z + H * 0.02), -0.05, sideSign * 0.06, H * 0.95);
      } else if (a.doing === 'leaning') {
        const l = world(person.hands.left), r = world(person.hands.right);
        const mid = l.add(r).multiplyScalar(0.5);
        prod(new THREE.Vector3(mid.x, 0, mid.z + H * 0.02), 0, 0, mid.y + H * 0.02);
      } else if (a.doing === 'walking') {
        // Over the shoulder, angled back.
        prod(new THREE.Vector3(hand.x, hand.y - H * 0.05, hand.z), -0.75, 0);
      } else {
        // Planted beside the foot, held upright.
        prod(new THREE.Vector3(hand.x + sideSign * H * 0.015, 0, hand.z + H * 0.03), 0, sideSign * 0.03);
      }
    }
    if (a.holding === 'rifle') {
      const wood = s.material('#5a3a22', { roughness: 0.6 });
      const barrel = s.rod([H * 0.16, H * 0.02, -H * 0.075], [-H * 0.16, H * 0.5, -H * 0.085], H * 0.009, steel);
      const stock = s.box([H * 0.05, H * 0.17, H * 0.025], [H * 0.12, H * 0.09, -H * 0.075], wood);
      stock.rotation.z = -0.55;
      const strap = s.box([H * 0.02, H * 0.4, H * 0.006], [0, H * 0.18, H * 0.075], s.material('#3a2c20'));
      strap.rotation.z = 0.7;
      joints.spine.add(barrel, stock, strap);
    }
    if (a.holding === 'lantern') {
      const hand = person.hands[a.doing === 'pointing' ? holdSide : freeSide];
      const body = s.box([H * 0.045, H * 0.07, H * 0.045], [0, -H * 0.075, 0], steel);
      const glass = s.box([H * 0.035, H * 0.045, H * 0.035], [0, -H * 0.07, 0], new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb347', emissiveIntensity: mix(0.6, 1.4, 1 - mood.daylight), roughness: 0.3 }));
      const handle = s.ring(H * 0.02, H * 0.004, [0, -H * 0.02, 0], steel);
      hand.add(body, glass, handle);
    }

    // The stain at their feet: a flat dark green blob on the ground.
    if (a.stain) {
      const shape = new THREE.Shape();
      const bumps = [random() * 6, random() * 6];
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24) * Math.PI * 2, rr = H * 0.17 * (1 + 0.22 * Math.sin(t * 3 + bumps[0]) + 0.14 * Math.sin(t * 7 + bumps[1]));
        if (i === 0) shape.moveTo(Math.cos(t) * rr, Math.sin(t) * rr); else shape.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
      }
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.006, 0);
      const pelvis = world(person.pelvis);
      const stain = s.mesh(geometry, s.material('#1b4a2b', { roughness: mix(0.2, 0.9, mood.wear), metalness: 0.1 }), [pelvis.x + (random() - 0.5) * H * 0.1, 0, pelvis.z + (a.doing === 'kneeling' ? H * 0.32 : H * 0.42)]);
      stain.castShadow = false;
    }

    const flicker = mix(0.2, 1.6, mood.energy);
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        if (spark) tip.emissiveIntensity = mix(0.4, 1.4, mood.energy) * (0.8 + 0.2 * Math.sin(time * 9 * flicker) * Math.sin(time * 2.3));
      },
    });
  },
});
