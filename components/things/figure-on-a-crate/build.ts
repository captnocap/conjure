import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureStyle, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    posture: choice('How are they sitting?', {
      upright: 'Sitting up straight, hands in the lap.',
      slumped: 'Slumped forward, elbows on the knees, head down.',
      beside: 'Not on it at all: crouched on the ground beside the crate.',
    }),
    seat: choice('What are they sitting on?', {
      wooden: 'A rough wooden crate with stencilled boards.',
      milk: 'A plastic milk crate, bright and ventilated.',
      drum: 'A dented steel oil drum.',
      sandbag: 'A slumped sandbag.',
    }),
    style: choice('What kind of figure is it?', {
      mannequin: 'A jointed wooden artist mannequin, faceless and warm-toned.',
      person: 'A simplified clothed person with two dot eyes.',
      silhouette: 'A flat dark silhouette, like a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs and bright paint.',
    }),
    holding: choice('What is in their hands?', {
      nothing: 'Nothing.',
      bowl: 'A bowl of food held close.',
      book: 'An open book.',
      bottle: 'A bottle, half finished.',
    }),
    head: choice('What is on their head?', {
      short: 'Short hair.', long: 'Long hair.', cap: 'A peaked cap.', hat: 'A brimmed hat.', hood: 'A hood up.',
    }),
    clothes: choice('What are they wearing?', {
      overalls: 'Work overalls and boots.',
      plain: 'A plain tee and dark trousers.',
      coat: 'A heavy coat and scarf.',
      uniform: 'A pale uniform shirt and dark trousers.',
    }),
    height: score('How big are they?', ['A small child', 'A short adult', 'Average height', 'Tall', 'Towering']),
    lamp: noul('Is there a work lamp clipped to the crate, lighting their face?'),
  },
  build(a, context) {
    const s = new Sculpture(context);
    const style: FigureStyle = ({ mannequin: 'mannequin', person: 'doll', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const outfit = {
      overalls: { top: '#4a6c9c', bottom: '#4a6c9c', shoes: '#4a3a2c' },
      plain: { top: '#d8d2c0', bottom: '#2b2d35', shoes: '#1d1d1f' },
      coat: { top: '#5a4635', bottom: '#2d2a28', shoes: '#241f1c' },
      uniform: { top: '#e5e8ea', bottom: '#202a3a', shoes: '#15151a' },
    }[a.clothes];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(context.random() * 5)];
    const height = 0.95 + a.height * 1.05;
    const person = figure(s, {
      height, style, hair: a.head, skin,
      pose: a.posture === 'beside' ? 'crouching' : a.posture === 'slumped' ? 'slumped' : 'sitting',
      gaze: a.posture === 'slumped' ? 'down' : a.holding === 'book' ? 'down' : 'ahead',
      mirror: context.random() < 0.5,
      ...outfit,
    });
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    const H = height;
    const seatTop = Math.max(0.12, person.hipHeight - 0.045 * H);
    const seatAt: [number, number] = a.posture === 'beside' ? [hips.x + 0.42 * H, hips.z - 0.1 * H] : [hips.x, hips.z - 0.02 * H];
    const seatHeight = a.posture === 'beside' ? 0.3 * H : seatTop;
    if (a.seat === 'wooden') {
      const wood = s.material('#a8865a');
      s.box([0.42 * H, seatHeight, 0.42 * H], [seatAt[0], seatHeight / 2, seatAt[1]], wood);
      for (let i = 0; i < 3; i++) s.box([0.44 * H, 0.012 * H, 0.44 * H], [seatAt[0], seatHeight * (0.2 + i * 0.3), seatAt[1]], s.material('#7d5f3c'));
    } else if (a.seat === 'milk') {
      const plastic = s.material(['#d3372b', '#2b6ed3', '#e8c21f'][Math.floor(context.random() * 3)], { roughness: 0.5 });
      const w = 0.36 * H;
      s.box([w, 0.02 * H, w], [seatAt[0], seatHeight - 0.01 * H, seatAt[1]], plastic);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.box([0.025 * H, seatHeight, 0.025 * H], [seatAt[0] + dx * w * 0.47, seatHeight / 2, seatAt[1] + dz * w * 0.47], plastic);
      for (let i = 0; i < 4; i++) {
        s.box([w, 0.012 * H, 0.012 * H], [seatAt[0], seatHeight * (0.15 + i * 0.22), seatAt[1] - w * 0.47], plastic);
        s.box([w, 0.012 * H, 0.012 * H], [seatAt[0], seatHeight * (0.15 + i * 0.22), seatAt[1] + w * 0.47], plastic);
        s.box([0.012 * H, 0.012 * H, w], [seatAt[0] - w * 0.47, seatHeight * (0.15 + i * 0.22), seatAt[1]], plastic);
        s.box([0.012 * H, 0.012 * H, w], [seatAt[0] + w * 0.47, seatHeight * (0.15 + i * 0.22), seatAt[1]], plastic);
      }
    } else if (a.seat === 'drum') {
      const steel = s.material('#5b6a74', { metalness: 0.5, roughness: 0.55 });
      s.cylinder(0.2 * H, 0.2 * H, seatHeight, [seatAt[0], seatHeight / 2, seatAt[1]], steel, 24);
      for (const y of [0.3, 0.7]) s.ring(0.205 * H, 0.012 * H, [seatAt[0], seatHeight * y, seatAt[1]], steel).rotation.x = Math.PI / 2;
    } else {
      const bag = s.ball([0.26 * H, seatHeight * 0.55, 0.22 * H], [seatAt[0], seatHeight * 0.5, seatAt[1]], s.material('#b9a46f', { roughness: 0.95 }), 14);
      bag.scale.y *= 1;
    }
    const hand = person.hands.right;
    if (a.holding === 'bowl') {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * H, 0.035 * H, 0.04 * H, 16), s.material('#e8e1d2'));
      bowl.position.set(-0.08 * H, 0.01 * H, 0.03 * H);
      bowl.castShadow = true;
      hand.add(bowl);
    }
    if (a.holding === 'book') {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.16 * H, 0.012 * H, 0.11 * H), s.material('#eee8d8'));
      book.position.set(-0.08 * H, 0.01 * H, 0.03 * H);
      book.rotation.x = -0.5;
      book.castShadow = true;
      hand.add(book);
    }
    if (a.holding === 'bottle') {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * H, 0.025 * H, 0.12 * H, 12), s.material('#3b6b3a', { roughness: 0.3 }));
      bottle.position.set(0, -0.02 * H, 0.03 * H);
      bottle.castShadow = true;
      hand.add(bottle);
    }
    if (a.lamp) {
      const arm = s.rod([seatAt[0] + 0.2 * H, seatHeight, seatAt[1] + 0.1 * H], [seatAt[0] + 0.3 * H, seatHeight + 0.45 * H, seatAt[1] + 0.05 * H], 0.012 * H, s.material('#2e2e30'));
      void arm;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.07 * H, 0.09 * H, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#3a3a3c', side: THREE.DoubleSide }));
      shade.position.set(seatAt[0] + 0.3 * H, seatHeight + 0.42 * H, seatAt[1] + 0.05 * H);
      shade.rotation.x = Math.PI * 0.35;
      shade.castShadow = true;
      s.root.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03 * H, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffd27a', emissiveIntensity: 1.6 }));
      bulb.position.copy(shade.position);
      s.root.add(bulb);
    }
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
