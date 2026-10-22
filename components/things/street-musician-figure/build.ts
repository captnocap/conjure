import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, type FigureStyle, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    instrument: choice('What do they play?', {
      guitar: 'An acoustic guitar held across the body.',
      accordion: 'A piano accordion with the bellows half open.',
      violin: 'A violin tucked under the chin.',
      saxophone: 'A saxophone hanging from a neck strap.',
    }),
    stance: choice('How do they play?', {
      standing: 'Standing, weight on one leg, leaning into the song.',
      seated: 'Sitting on a small amplifier.',
      crouched: 'Crouched low over the instrument, intent.',
    }),
    style: choice('What kind of figure is it?', {
      mannequin: 'A jointed wooden artist mannequin, faceless and warm-toned.',
      person: 'A simplified clothed person with two dot eyes.',
      silhouette: 'A flat dark silhouette, like a cut-out against the light.',
      toy: 'A blocky toy figure with square limbs and bright paint.',
    }),
    head: choice('What is on their head?', {
      short: 'Short hair.', long: 'Long hair.', hat: 'A brimmed hat tipped back.', cap: 'A flat cap.', hood: 'A hood up.',
    }),
    clothes: choice('What are they wearing?', {
      waistcoat: 'A white shirt and a dark waistcoat.',
      denim: 'A denim jacket and worn jeans.',
      coat: 'A long coat against the cold.',
      bright: 'A loud patterned shirt and light trousers.',
    }),
    takings: score('How are the takings?', ['An empty case', 'A few coins', 'A scatter of coins and a note', 'A generous evening']),
    sign: noul('Is there a hand-lettered sign propped against the case?'),
    height: score('How tall are they?', ['A small child', 'A short adult', 'Average height', 'Tall', 'Towering']),
  },
  build(a, context) {
    const s = new Sculpture(context);
    const style: FigureStyle = ({ mannequin: 'mannequin', person: 'doll', silhouette: 'silhouette', toy: 'blocky' } as const)[a.style];
    const outfit = {
      waistcoat: { top: '#2b2b33', bottom: '#2b2b33', shoes: '#1d1d1f', sleeves: 'short' as const },
      denim: { top: '#4d6a9c', bottom: '#35486b', shoes: '#8d6b4f', sleeves: 'long' as const },
      coat: { top: '#4a4038', bottom: '#2d2a28', shoes: '#241f1c', sleeves: 'long' as const },
      bright: { top: '#d9573f', bottom: '#d8cfb6', shoes: '#f0ede4', sleeves: 'short' as const },
    }[a.clothes];
    const skin = ['#d9b08c', '#b5805a', '#7a4f33', '#f0cfb0', '#9a6b4b'][Math.floor(context.random() * 5)];
    const H = 0.95 + a.height * 1.05;
    const person = figure(s, {
      height: H, style, hair: a.head, skin,
      pose: a.stance === 'seated' ? 'sitting' : a.stance === 'crouched' ? 'crouching' : 'carrying',
      gaze: a.stance === 'crouched' ? 'down' : 'ahead',
      mirror: context.random() < 0.5,
      ...outfit,
    });
    s.root.add(person.root);
    person.root.updateMatrixWorld(true);
    const hips = person.pelvis.getWorldPosition(new THREE.Vector3());
    if (a.stance === 'seated') {
      const seat = Math.max(0.12, person.hipHeight - 0.045 * H);
      const amp = s.box([0.36 * H, seat, 0.3 * H], [hips.x, seat / 2, hips.z - 0.02 * H], s.material('#2a2a2c'));
      void amp;
      s.box([0.3 * H, seat * 0.55, 0.01 * H], [hips.x, seat * 0.45, hips.z + 0.14 * H], s.material('#6e6a5e'));
    }
    // The instrument hangs between the hands, in front of the chest.
    const chest = person.pelvis.getWorldPosition(new THREE.Vector3());
    chest.y += 0.22 * H;
    chest.z += 0.16 * H;
    const wood = s.material('#a9743f', { roughness: 0.4 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 });
    if (a.instrument === 'guitar') {
      const body = s.ball([0.14 * H, 0.17 * H, 0.04 * H], [chest.x + 0.04 * H, chest.y - 0.08 * H, chest.z], wood, 16);
      body.rotation.z = 0.5;
      const neck = s.box([0.3 * H, 0.03 * H, 0.025 * H], [chest.x - 0.16 * H, chest.y + 0.02 * H, chest.z], s.material('#4a2f1b'));
      neck.rotation.z = 0.35;
    }
    if (a.instrument === 'accordion') {
      s.box([0.14 * H, 0.2 * H, 0.1 * H], [chest.x - 0.1 * H, chest.y - 0.05 * H, chest.z], s.material('#8c1f2a', { roughness: 0.35 }));
      s.box([0.14 * H, 0.2 * H, 0.1 * H], [chest.x + 0.12 * H, chest.y - 0.05 * H, chest.z], s.material('#8c1f2a', { roughness: 0.35 }));
      for (let i = 0; i < 6; i++) s.box([0.02 * H, 0.18 * H, 0.09 * H], [chest.x - 0.02 * H + i * 0.022 * H, chest.y - 0.05 * H, chest.z], s.material(i % 2 ? '#1d1d1f' : '#e9e4d6'));
    }
    if (a.instrument === 'violin') {
      const body = s.ball([0.06 * H, 0.1 * H, 0.025 * H], [chest.x - 0.05 * H, chest.y + 0.2 * H, chest.z], wood, 14);
      body.rotation.z = 1.1;
      const neck = s.box([0.2 * H, 0.015 * H, 0.015 * H], [chest.x - 0.18 * H, chest.y + 0.26 * H, chest.z], s.material('#4a2f1b'));
      neck.rotation.z = 0.35;
      const bow = s.rod([chest.x - 0.02 * H, chest.y + 0.05 * H, chest.z + 0.04 * H], [chest.x + 0.08 * H, chest.y + 0.3 * H, chest.z + 0.02 * H], 0.004 * H, s.material('#3b2a22'));
      void bow;
    }
    if (a.instrument === 'saxophone') {
      s.tube([[chest.x + 0.02 * H, chest.y + 0.12 * H, chest.z], [chest.x + 0.03 * H, chest.y - 0.12 * H, chest.z + 0.02 * H], [chest.x + 0.06 * H, chest.y - 0.2 * H, chest.z + 0.06 * H], [chest.x + 0.1 * H, chest.y - 0.1 * H, chest.z + 0.1 * H]], 0.02 * H, brass);
      s.cylinder(0.05 * H, 0.03 * H, 0.06 * H, [chest.x + 0.11 * H, chest.y - 0.06 * H, chest.z + 0.1 * H], brass, 14);
    }
    // The open case in front, with the evening's takings.
    const caseAt = { x: hips.x + (context.random() < 0.5 ? -0.45 : 0.45) * H, z: hips.z + 0.35 * H };
    const lining = s.material('#5a1f2e');
    s.box([0.44 * H, 0.05 * H, 0.17 * H], [caseAt.x, 0.025 * H, caseAt.z], s.material('#1d1d1f'));
    s.box([0.4 * H, 0.01 * H, 0.14 * H], [caseAt.x, 0.055 * H, caseAt.z], lining);
    const lid = s.box([0.44 * H, 0.17 * H, 0.03 * H], [caseAt.x, 0.1 * H, caseAt.z - 0.1 * H], s.material('#1d1d1f'));
    lid.rotation.x = -0.35;
    const coins = Math.round(a.takings * 14);
    for (let i = 0; i < coins; i++) {
      const coin = s.cylinder(0.012 * H, 0.012 * H, 0.003 * H, [caseAt.x + (context.random() - 0.5) * 0.3 * H, 0.062 * H, caseAt.z + (context.random() - 0.5) * 0.1 * H], i % 3 ? brass : s.material('#c7c9cc', { metalness: 0.7, roughness: 0.35 }), 10);
      void coin;
    }
    if (a.takings > 0.5) s.box([0.08 * H, 0.002 * H, 0.04 * H], [caseAt.x + 0.1 * H, 0.063 * H, caseAt.z], s.material('#9fb79a'));
    if (a.sign) {
      const sign = s.box([0.18 * H, 0.12 * H, 0.01 * H], [caseAt.x + 0.26 * H, 0.06 * H, caseAt.z + 0.02 * H], s.material('#d9c9a1'));
      sign.rotation.x = -0.3;
      for (let i = 0; i < 3; i++) s.box([0.12 * H - i * 0.02 * H, 0.012 * H, 0.004 * H], [caseAt.x + 0.26 * H, 0.095 * H - i * 0.03 * H, caseAt.z + 0.03 * H + i * 0.009 * H], s.material('#2a2320'));
    }
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
