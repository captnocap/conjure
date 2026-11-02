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
    sound: choice('What sound equipment joins the player?', {
      acoustic: 'Only the acoustic instrument and the open air.',
      microphone: 'A small microphone on a tripod stand reaches toward the instrument.',
      pedal: 'A compact effects pedal and its coiled cable sit by one foot.',
      speaker: 'A small powered speaker with a visible grille stands beside the player.',
    }),
    music: choice('Where is the tune written down?', {
      memory: 'They play from memory with no sheet music.',
      stand: 'An open two-page score rests on a folding music stand.',
      book: 'A small open music book lies beside the case.',
      card: 'A single set-list card is clipped above the case lid.',
    }),
    case: choice('What carries the instrument between performances?', {
      hard: 'A dark rigid case with a raised lid and velvet lining.',
      soft: 'A low padded canvas gig bag with a curved stitched edge.',
      trunk: 'A small wooden travelling trunk with metal corner fittings.',
      flat: 'A shallow case whose lid lies flat on the ground behind it.',
    }),
    percussion: choice('What keeps time beside the main instrument?', {
      none: 'No additional percussion.',
      tambourine: 'A small tambourine with visible paired jingles rests beside the case.',
      stomp: 'A wooden foot-stomp box waits just ahead of one shoe.',
      shaker: 'A pair of bright egg shakers rests on a little cloth.',
    }),
    moment: choice('What moment of the performance is this?', {
      song: 'Both hands meet the instrument in the middle of a tune.',
      tuning: 'One hand reaches toward the tuning end while the player looks down.',
      pause: 'The instrument hangs lower during a thoughtful pause.',
      packing: 'The player has lowered the instrument and shut the case to leave.',
    }),
    message: choice('If there is a sign, what does it say?', {
      thanks: 'THANK YOU: a simple invitation to leave a tip.',
      request: 'REQUESTS: the audience can choose the next tune.',
      journey: 'NEXT TRAIN HOME: the takings are a fare for the journey.',
      lesson: 'FIRST PUBLIC SONG: a new performer taking a brave small step.',
    }),
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
      gaze: a.stance === 'crouched' || a.moment === 'tuning' ? 'down' : 'ahead',
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
    chest.y += (a.moment === 'pause' || a.moment === 'packing' ? 0.12 : 0.22) * H;
    chest.z += 0.16 * H;
    const wood = s.material('#a9743f', { roughness: 0.4 });
    const brass = s.material('#c9a44a', { metalness: 0.7, roughness: 0.3 });
    if (a.instrument === 'guitar') {
      const body = s.ball([0.14 * H, 0.17 * H, 0.04 * H], [chest.x + 0.04 * H, chest.y - 0.08 * H, chest.z], wood, 16);
      body.rotation.z = 0.5;
      const neck = s.box([0.3 * H, 0.03 * H, 0.025 * H], [chest.x - 0.16 * H, chest.y + 0.02 * H, chest.z], s.material('#4a2f1b'));
      neck.rotation.z = 0.35;
      const soundHole = s.cylinder(0.035 * H, 0.035 * H, 0.003 * H, [chest.x + 0.01 * H, chest.y - 0.06 * H, chest.z + 0.04 * H], s.material('#35241c'), 18);
      soundHole.rotation.x = Math.PI / 2;
      s.box([0.06 * H, 0.013 * H, 0.007 * H], [chest.x + 0.08 * H, chest.y - 0.12 * H, chest.z + 0.043 * H], s.material('#3c2519'));
      for (let i = 0; i < 6; i++) s.rod([chest.x - 0.3 * H, chest.y + 0.07 * H + i * 0.0025 * H, chest.z + 0.02 * H], [chest.x + 0.08 * H, chest.y - 0.126 * H + i * 0.0025 * H, chest.z + 0.047 * H], 0.0007 * H, brass);
      for (let i = 0; i < 3; i++) for (const side of [-1, 1]) s.ball([0.007 * H, 0.007 * H, 0.007 * H], [chest.x - (0.26 + i * 0.018) * H, chest.y + (0.045 + side * 0.025) * H, chest.z], brass, 8);
    }
    if (a.instrument === 'accordion') {
      s.box([0.14 * H, 0.2 * H, 0.1 * H], [chest.x - 0.1 * H, chest.y - 0.05 * H, chest.z], s.material('#8c1f2a', { roughness: 0.35 }));
      s.box([0.14 * H, 0.2 * H, 0.1 * H], [chest.x + 0.12 * H, chest.y - 0.05 * H, chest.z], s.material('#8c1f2a', { roughness: 0.35 }));
      for (let i = 0; i < 6; i++) s.box([0.02 * H, 0.18 * H, 0.09 * H], [chest.x - 0.02 * H + i * 0.022 * H, chest.y - 0.05 * H, chest.z], s.material(i % 2 ? '#1d1d1f' : '#e9e4d6'));
      for (let i = 0; i < 10; i++) {
        s.box([0.047 * H, 0.016 * H, 0.008 * H], [chest.x - 0.13 * H, chest.y + (0.035 - i * 0.018) * H, chest.z + 0.055 * H], s.material('#eee9dd'));
        if (i % 3 !== 2) s.box([0.022 * H, 0.006 * H, 0.01 * H], [chest.x - 0.117 * H, chest.y + (0.027 - i * 0.018) * H, chest.z + 0.063 * H], s.material('#26252a'));
      }
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
    // Reach after settling so the instrument is held rather than hovering ahead of the hands.
    const leftAt = a.instrument === 'violin' ? [chest.x - 0.19 * H, chest.y + 0.25 * H, chest.z] : a.instrument === 'guitar' ? [chest.x - 0.2 * H, chest.y + 0.03 * H, chest.z] : [chest.x - 0.08 * H, chest.y, chest.z + 0.04 * H];
    const rightAt = a.instrument === 'violin' ? [chest.x + 0.04 * H, chest.y + 0.2 * H, chest.z + 0.04 * H] : [chest.x + 0.09 * H, chest.y - 0.08 * H, chest.z + 0.05 * H];
    person.reach('left', new THREE.Vector3(...leftAt), { space: s.root });
    person.reach('right', new THREE.Vector3(...rightAt), { space: s.root });
    if (a.moment === 'tuning') person.lookAt(new THREE.Vector3(...leftAt), s.root);
    // The case carries the evening's takings or closes when the performer packs up.
    const caseAt = { x: hips.x + (context.random() < 0.5 ? -0.45 : 0.45) * H, z: hips.z + 0.35 * H };
    const lining = s.material('#5a1f2e');
    const casePaint = s.material(a.case === 'trunk' ? '#90613c' : a.case === 'soft' ? '#5e6b5a' : '#1d1d1f');
    s.box([0.44 * H, 0.05 * H, 0.17 * H], [caseAt.x, 0.025 * H, caseAt.z], casePaint);
    s.box([0.4 * H, 0.01 * H, 0.14 * H], [caseAt.x, 0.055 * H, caseAt.z], lining);
    if (a.moment === 'packing') s.box([0.44 * H, 0.02 * H, 0.17 * H], [caseAt.x, 0.064 * H, caseAt.z], casePaint);
    else if (a.case === 'flat') s.box([0.44 * H, 0.012 * H, 0.17 * H], [caseAt.x, 0.006 * H, caseAt.z - 0.18 * H], casePaint);
    else if (a.case === 'soft') {
      s.tube([[caseAt.x - 0.2 * H, 0.06 * H, caseAt.z - 0.07 * H], [caseAt.x - 0.22 * H, 0.06 * H, caseAt.z], [caseAt.x, 0.06 * H, caseAt.z + 0.085 * H], [caseAt.x + 0.22 * H, 0.06 * H, caseAt.z], [caseAt.x + 0.2 * H, 0.06 * H, caseAt.z - 0.07 * H]], 0.008 * H, s.material('#c0b798'));
    } else {
      const lid = s.box([0.44 * H, 0.17 * H, 0.03 * H], [caseAt.x, 0.1 * H, caseAt.z - 0.1 * H], casePaint);
      lid.rotation.x = -0.35;
    }
    if (a.case === 'trunk') for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.04 * H, 0.055 * H, 0.025 * H], [caseAt.x + x * 0.2 * H, 0.028 * H, caseAt.z + z * 0.08 * H], brass);
    s.tube([[caseAt.x - 0.045 * H, 0.03 * H, caseAt.z + 0.09 * H], [caseAt.x - 0.04 * H, 0.025 * H, caseAt.z + 0.12 * H], [caseAt.x + 0.04 * H, 0.025 * H, caseAt.z + 0.12 * H], [caseAt.x + 0.045 * H, 0.03 * H, caseAt.z + 0.09 * H]], 0.005 * H, casePaint);
    const coins = a.moment === 'packing' ? 0 : Math.round(a.takings * 14);
    for (let i = 0; i < coins; i++) {
      const coin = s.cylinder(0.012 * H, 0.012 * H, 0.003 * H, [caseAt.x + (context.random() - 0.5) * 0.3 * H, 0.062 * H, caseAt.z + (context.random() - 0.5) * 0.1 * H], i % 3 ? brass : s.material('#c7c9cc', { metalness: 0.7, roughness: 0.35 }), 10);
      void coin;
    }
    if (a.takings > 0.5 && a.moment !== 'packing') s.box([0.08 * H, 0.002 * H, 0.04 * H], [caseAt.x + 0.1 * H, 0.063 * H, caseAt.z], s.material('#9fb79a'));
    if (a.sign) {
      const sign = s.box([0.18 * H, 0.12 * H, 0.01 * H], [caseAt.x + 0.26 * H, 0.06 * H, caseAt.z + 0.02 * H], s.material('#d9c9a1'));
      sign.rotation.x = -0.3;
      const words = { thanks: 'THANK YOU', request: 'REQUESTS', journey: 'NEXT TRAIN HOME', lesson: 'FIRST PUBLIC SONG' }[a.message];
      const text = s.label(words, 0.17 * H, 0.07 * H, [0, 0, 0], '#2a2320', '#d9c9a1');
      text.position.set(caseAt.x + 0.26 * H, 0.065 * H, caseAt.z + 0.034 * H);
      text.rotation.x = -0.3;
    }
    const iron = s.material('#33353a'), paper = s.material('#e9e3d2');
    const tripod = (x: number, z: number, height: number) => {
      s.rod([x, 0.03 * H, z], [x, height, z], 0.007 * H, iron);
      for (let j = 0; j < 3; j++) { const angle = j * Math.PI * 2 / 3; s.rod([x, 0.1 * H, z], [x + Math.cos(angle) * 0.12 * H, 0.008 * H, z + Math.sin(angle) * 0.12 * H], 0.006 * H, iron); }
    };
    if (a.sound === 'microphone') {
      tripod(-0.4 * H, 0.21 * H, chest.y);
      s.rod([-0.4 * H, chest.y, 0.21 * H], [chest.x, chest.y + 0.08 * H, chest.z + 0.1 * H], 0.006 * H, iron);
      s.ball([0.035 * H, 0.018 * H, 0.018 * H], [chest.x, chest.y + 0.08 * H, chest.z + 0.1 * H], iron, 12);
    }
    if (a.sound === 'pedal') {
      s.box([0.1 * H, 0.035 * H, 0.12 * H], [-0.21 * H, 0.0175 * H, 0.18 * H], s.material('#b55a40'));
      s.cylinder(0.009 * H, 0.009 * H, 0.015 * H, [-0.21 * H, 0.044 * H, 0.21 * H], brass, 10);
      const cable: [number, number, number][] = Array.from({ length: 34 }, (_, i) => { const t = i / 33 * Math.PI * 4; return [-0.35 * H + Math.cos(t) * 0.065 * H, 0.006 * H, 0.11 * H + Math.sin(t) * 0.065 * H]; });
      s.tube(cable, 0.002 * H, iron);
      s.tube([[-0.21 * H, 0.025 * H, 0.13 * H], [-0.3 * H, 0.009 * H, 0.11 * H], [chest.x, chest.y - 0.15 * H, chest.z]], 0.002 * H, iron);
    }
    if (a.sound === 'speaker') {
      s.box([0.23 * H, 0.31 * H, 0.18 * H], [-0.43 * H, 0.155 * H, -0.15 * H], iron);
      const cone = s.cylinder(0.079 * H, 0.079 * H, 0.006 * H, [-0.43 * H, 0.16 * H, -0.055 * H], s.material('#62666a'), 24); cone.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) s.box([0.19 * H, 0.004 * H, 0.007 * H], [-0.43 * H, (0.055 + i * 0.031) * H, -0.048 * H], iron);
    }
    if (a.music === 'stand') {
      const x = 0.36 * H, z = 0.03 * H, h = chest.y;
      tripod(x, z, h);
      const desk = s.box([0.29 * H, 0.2 * H, 0.013 * H], [x, h, z], iron); desk.rotation.x = -0.2;
      for (const side of [-1, 1]) { const sheet = s.box([0.12 * H, 0.17 * H, 0.003 * H], [x + side * 0.067 * H, h, z + 0.01 * H], paper); sheet.rotation.x = -0.2; }
      for (let i = 0; i < 8; i++) s.rod([x - 0.115 * H, h + (0.066 - i * 0.018) * H, z + (0.026 - i * 0.0036) * H], [x + 0.115 * H, h + (0.066 - i * 0.018) * H, z + (0.026 - i * 0.0036) * H], 0.0008 * H, iron);
    }
    if (a.music === 'book') {
      for (const side of [-1, 1]) { const page = s.box([0.1 * H, 0.012 * H, 0.14 * H], [caseAt.x + side * 0.052 * H, 0.01 * H, caseAt.z + 0.2 * H], paper); page.rotation.z = side * 0.08; }
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) s.box([0.08 * H, 0.002 * H, 0.002 * H], [caseAt.x + side * 0.052 * H, 0.022 * H, caseAt.z + (0.15 + i * 0.02) * H], iron);
    }
    if (a.music === 'card') {
      const card = s.label('SET 1 / SET 2', 0.15 * H, 0.07 * H, [0, 0, 0], '#343333', '#f0e9d5'); card.position.set(caseAt.x, 0.14 * H, caseAt.z - 0.075 * H);
      s.box([0.02 * H, 0.06 * H, 0.012 * H], [caseAt.x, 0.1 * H, caseAt.z - 0.082 * H], iron);
    }
    if (a.percussion === 'tambourine') {
      s.cylinder(0.075 * H, 0.075 * H, 0.025 * H, [-0.3 * H, 0.0125 * H, 0.35 * H], wood, 24);
      s.cylinder(0.067 * H, 0.067 * H, 0.003 * H, [-0.3 * H, 0.026 * H, 0.35 * H], paper, 24);
      for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; for (const h of [0.009, 0.018]) s.cylinder(0.014 * H, 0.014 * H, 0.002 * H, [(-0.3 + Math.cos(angle) * 0.078) * H, h * H, (0.35 + Math.sin(angle) * 0.078) * H], brass, 10); }
    }
    if (a.percussion === 'stomp') { s.box([0.14 * H, 0.05 * H, 0.18 * H], [0.13 * H, 0.025 * H, 0.21 * H], wood); s.box([0.1 * H, 0.003 * H, 0.14 * H], [0.13 * H, 0.052 * H, 0.21 * H], s.material('#382e26')); }
    if (a.percussion === 'shaker') {
      s.box([0.17 * H, 0.002 * H, 0.12 * H], [-0.3 * H, 0.001 * H, 0.32 * H], s.material('#60777b'));
      for (const x of [-0.34, -0.27]) s.ball([0.024 * H, 0.026 * H, 0.035 * H], [x * H, 0.028 * H, 0.32 * H], s.material(x < -0.3 ? '#ad513a' : '#d8ad4c'), 14);
    }
    return s.finish({ update: (dt, time) => { if (a.moment === 'song' || a.moment === 'tuning') person.update(dt, time); } });
  },
});
