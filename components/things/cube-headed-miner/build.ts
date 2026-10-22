import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    tool: choice('What are they holding?', {
      pickaxe: 'A pickaxe slung up over the shoulder.',
      torch: 'A burning torch held up high to see by.',
      sword: 'A sword held out in front, ready.',
      shovel: 'A shovel with its blade resting on the ground.',
      nothing: 'Empty hands.',
    }),
    pose: choice('What are they doing?', {
      standing: 'Standing square, feet planted.',
      walking: 'Mid-stride, walking on.',
      crouching: 'Crouched low, sneaking or peering.',
      pointing: 'Pointing at something far off.',
    }),
    back: choice('What is strapped to their back?', {
      nothing: 'Nothing.',
      backpack: 'A leather backpack overflowing with ore blocks.',
      bedroll: 'A rolled red bed tied across the shoulders.',
      cape: 'A short cape hanging from the shoulders.',
    }),
    look: choice('Where are they looking?', {
      hole: 'Down into a freshly dug square hole at their feet.',
      horizon: 'Straight out at the horizon.',
      sky: 'Up at the sky.',
    }),
    armour: choice('What are they wearing?', {
      diamond: 'Full diamond armour, bright cyan-blue plates and helmet.',
      iron: 'Dull grey iron armour.',
      gold: 'Gleaming gold armour.',
      leather: 'Brown leather tunic and trousers.',
      shirt: 'A plain teal shirt and blue trousers, no armour at all.',
    }),
    feet: choice('What lies at their feet?', {
      nothing: 'Nothing.',
      cobble: 'A pile of grey cobblestone blocks.',
      coal: 'A scatter of black coal lumps.',
      diamonds: 'A few glinting diamonds.',
      bucket: 'A dropped iron bucket.',
      sign: 'A small wooden sign stuck in the ground.',
    }),
    lamp: noul('Are they wearing a mining helmet with a lamp on it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 1.65 + random() * 0.3;
    const outfit = {
      diamond: { top: '#4fd4e0', bottom: '#3bbccb', shoes: '#2a8ea0', plate: '#4fd4e0' },
      iron: { top: '#c9ccd0', bottom: '#a7abb0', shoes: '#4a4a4a', plate: '#c9ccd0' },
      gold: { top: '#e3b53a', bottom: '#c99a2a', shoes: '#5a4a1a', plate: '#e3b53a' },
      leather: { top: '#a46a3a', bottom: '#7a4a26', shoes: '#4a2f1b', plate: null },
      shirt: { top: '#3aa8a0', bottom: '#3c4aa8', shoes: '#5a5a5a', plate: null },
    }[a.armour];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(random() * 5)];
    const hairs = ['short', 'none', 'long', 'short'] as const;
    const person = figure(s, {
      height: H, style: 'blocky', hair: outfit.plate && !a.lamp ? 'none' : hairs[Math.floor(random() * hairs.length)],
      pose: a.pose, gaze: a.look === 'hole' ? 'down' : a.look === 'sky' ? 'up' : 'ahead',
      skin, top: outfit.top, bottom: outfit.bottom, shoes: outfit.shoes, sleeves: outfit.plate ? 'long' : 'short',
      hairColor: ['#3b2a22', '#1d1a18', '#c9842a', '#6b4a2e'][Math.floor(random() * 4)],
    });
    s.root.add(person.root);
    const headR = H * 0.064;
    const limb = H * 0.036;
    const box = (size: V3, at: V3, material: THREE.Material, parent: THREE.Object3D) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const iron = s.material('#9ea3a8', { metalness: 0.5, roughness: 0.45 });
    const wood = s.material('#8a5a2b', { roughness: 0.8 });
    const flame = new THREE.MeshStandardMaterial({ color: '#ffb640', emissive: '#ff8a1a', emissiveIntensity: mix(0.8, 2, 1 - mood.daylight), roughness: 0.5 });
    const gem = new THREE.MeshStandardMaterial({ color: '#7fe9f2', emissive: '#3fc4d8', emissiveIntensity: 0.9, roughness: 0.3 });
    const toolHead = a.armour === 'diamond' ? gem : a.armour === 'gold' ? s.material('#e3b53a', { metalness: 0.7, roughness: 0.35 }) : iron;

    // Helmets and the head lamp.
    if (outfit.plate && !a.lamp) {
      const helm = box([headR * 1.95, headR * 1.2, headR * 1.95], [0, headR * 0.55, 0], s.material(outfit.plate, { metalness: 0.3, roughness: 0.4 }), person.head);
      void helm;
      box([headR * 1.95, headR * 0.5, headR * 0.2], [0, headR * -0.3, headR * 0.95], s.material(outfit.plate, { metalness: 0.3, roughness: 0.4 }), person.head);
    }
    if (a.lamp) {
      box([headR * 2.0, headR * 1.1, headR * 2.0], [0, headR * 0.6, 0], s.material('#e8b830', { roughness: 0.5 }), person.head);
      box([headR * 2.2, headR * 0.15, headR * 2.2], [0, headR * 0.1, headR * 0.1], s.material('#e8b830', { roughness: 0.5 }), person.head);
      box([headR * 0.5, headR * 0.5, headR * 0.3], [0, headR * 0.6, headR * 1.1], flame, person.head);
    }

    // The right arm takes a pose for the tool, and the tool hangs from the hand along the forearm.
    const { joints } = person;
    // Tools hang from a grip under the hand; in the crouch and point the forearm aims down, so the grip tips the tool up.
    const hand = new THREE.Group();
    person.hands.right.add(hand);
    if (a.pose === 'crouching') hand.rotation.x = a.tool === 'shovel' ? -0.3 : -1.35;
    if (a.pose === 'pointing') hand.rotation.x = -0.9;
    const armPose: Record<typeof a.tool, [number, number] | null> = {
      pickaxe: [-0.35, -2.3], torch: [-2.3, -0.3], sword: [-1.15, -0.35], shovel: [-0.55, -0.15], nothing: null,
    };
    const arm = a.pose === 'crouching' || a.pose === 'pointing' ? null : armPose[a.tool];
    if (arm) {
      joints.shoulders.right.rotation.set(arm[0], 0, -0.15);
      joints.elbows.right.rotation.set(arm[1], 0, 0);
    }
    let flameMesh: THREE.Mesh | null = null;
    if (a.tool === 'pickaxe') {
      box([0.07, 1.05, 0.07], [0, -0.25, 0], wood, hand);
      box([0.11, 0.11, 0.8], [0, -0.72, 0], toolHead, hand);
      for (const z of [-1, 1]) box([0.08, 0.08, 0.2], [0, -0.68, z * 0.48], toolHead, hand);
    }
    if (a.tool === 'torch') {
      box([0.09, 0.7, 0.09], [0, -0.2, 0], wood, hand);
      flameMesh = box([0.22, 0.22, 0.22], [0, -0.62, 0], flame, hand);
    }
    if (a.tool === 'sword') {
      box([0.07, 0.26, 0.07], [0, 0, 0], s.material('#4a2f1b'), hand);
      box([0.32, 0.06, 0.06], [0, -0.14, 0], toolHead, hand);
      box([0.1, 0.9, 0.035], [0, -0.62, 0], toolHead, hand);
      box([0.05, 0.12, 0.03], [0, -1.12, 0], toolHead, hand);
    }
    if (a.tool === 'shovel') {
      box([0.07, 1.1, 0.07], [0, -0.3, 0], wood, hand);
      box([0.28, 0.32, 0.05], [0, -0.98, 0], toolHead, hand);
    }
    person.settle();
    person.root.updateMatrixWorld(true);

    // On the back.
    const torsoL = H * 0.28;
    const backZ = -(limb * 1.2 + 0.02);
    if (a.back === 'backpack') {
      const pack = box([H * 0.2, H * 0.22, H * 0.12], [0, torsoL * 0.55, backZ - H * 0.06], s.material('#6b4a2e', { roughness: 0.85 }), joints.spine);
      void pack;
      for (let i = 0; i < 5; i++) box([0.1, 0.1, 0.1], [(random() - 0.5) * H * 0.16, torsoL * 0.55 + H * 0.13, backZ - H * 0.06 + (random() - 0.5) * H * 0.08], i % 2 ? gem : s.material('#e3b53a', { metalness: 0.6, roughness: 0.4 }), joints.spine);
      box([H * 0.03, H * 0.25, H * 0.02], [H * 0.08, torsoL * 0.5, limb * 1.25], s.material('#4a2f1b'), joints.spine);
      box([H * 0.03, H * 0.25, H * 0.02], [-H * 0.08, torsoL * 0.5, limb * 1.25], s.material('#4a2f1b'), joints.spine);
    }
    if (a.back === 'bedroll') {
      box([H * 0.3, H * 0.09, H * 0.09], [0, torsoL * 0.9, backZ - H * 0.045], s.material('#c23b3b', { roughness: 0.9 }), joints.spine);
      box([H * 0.31, H * 0.1, H * 0.1], [H * 0.1, torsoL * 0.9, backZ - H * 0.045], s.material('#f1e9d6', { roughness: 0.9 }), joints.spine).scale.set(0.12, 1, 1);
      box([H * 0.31, H * 0.1, H * 0.1], [-H * 0.1, torsoL * 0.9, backZ - H * 0.045], s.material('#f1e9d6', { roughness: 0.9 }), joints.spine).scale.set(0.12, 1, 1);
    }
    if (a.back === 'cape') {
      const cape = box([H * 0.24, torsoL * 1.1, 0.02], [0, torsoL * 0.4, backZ - 0.02], s.material(a.armour === 'gold' ? '#5a2a8a' : '#b8302a', { roughness: 0.95, side: THREE.DoubleSide }), joints.spine);
      cape.rotation.x = 0.12;
    }

    // What they look at and what lies at their feet, in the figure's own ground space.
    const root = person.root;
    root.updateMatrixWorld(true);
    const feet = root.position;
    const ahead = a.pose === 'crouching' ? 0.75 : 0.6;
    if (a.look === 'hole') {
      s.box([1, 0.05, 1], [feet.x, 0.025, feet.z + ahead + 0.5], s.material('#0b0a10', { roughness: 1 }));
      const dirt = s.material('#7a5230', { roughness: 1 });
      s.box([1.3, 0.14, 0.15], [feet.x, 0.07, feet.z + ahead + 1.07], dirt);
      s.box([0.15, 0.14, 1.0], [feet.x + 0.58, 0.07, feet.z + ahead + 0.5], dirt);
      s.box([0.15, 0.12, 1.0], [feet.x - 0.58, 0.06, feet.z + ahead + 0.5], dirt);
      for (let i = 0; i < 4; i++) s.box([0.2, 0.12, 0.2], [feet.x + (random() - 0.5) * 1.4, 0.06, feet.z + ahead + 0.5 + (random() - 0.5) * 1.4], dirt);
    }
    const spot: [number, number] = [feet.x + (random() < 0.5 ? -0.7 : 0.7), feet.z + 0.2 + random() * 0.3];
    if (a.feet === 'cobble') for (let i = 0; i < 5; i++) s.box([0.24, 0.24, 0.24], [spot[0] + (random() - 0.5) * 0.4, i < 3 ? 0.12 : 0.36, spot[1] + (random() - 0.5) * 0.4], s.material('#8d8f8a', { roughness: 0.95 }));
    if (a.feet === 'coal') for (let i = 0; i < 6; i++) s.box([0.16, 0.14, 0.16], [spot[0] + (random() - 0.5) * 0.8, 0.07, spot[1] + (random() - 0.5) * 0.8], s.material('#1e1d1f', { roughness: 0.9 }));
    if (a.feet === 'diamonds') for (let i = 0; i < 3; i++) s.box([0.16, 0.16, 0.16], [spot[0] + (random() - 0.5) * 0.6, 0.08, spot[1] + (random() - 0.5) * 0.6], gem).rotation.y = random();
    if (a.feet === 'bucket') {
      s.cylinder(0.14, 0.11, 0.26, [spot[0], 0.13, spot[1]], iron, 10);
      s.ring(0.14, 0.015, [spot[0], 0.27, spot[1]], iron, Math.PI).rotation.x = Math.PI / 2;
    }
    if (a.feet === 'sign') {
      s.box([0.06, 0.5, 0.06], [spot[0], 0.25, spot[1]], wood);
      s.box([0.6, 0.36, 0.05], [spot[0], 0.65, spot[1]], s.material('#b88a4a'));
      for (let i = 0; i < 3; i++) s.box([0.4 - i * 0.08, 0.04, 0.012], [spot[0] - i * 0.03, 0.75 - i * 0.1, spot[1] + 0.03], s.material('#3a2a1a'));
    }

    const energy = mood.energy;
    const phase = random() * 6;
    return s.finish({
      update: (dt, time) => {
        person.update(dt, time);
        if (flameMesh) {
          flameMesh.scale.setScalar(1 + Math.sin(time * 9 + phase) * 0.12 * (0.4 + energy));
          flame.emissiveIntensity = mix(0.8, 2, 1 - mood.daylight) * (0.9 + Math.sin(time * 7 + phase) * 0.1);
        }
      },
    });
  },
});
