import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    task: choice('What is the volunteer doing?', { sorting: 'Leaning over a sorting tray, separating seeds by hand.', packing: 'Filling a paper envelope with carefully cleaned seeds.', brushing: 'Sweeping chaff to the edge of a screen with a short brush.', examining: 'Holding one seed up to a magnifying glass.' }),
    posture: choice('How are they working?', { standing: 'Standing at a waist-high work stand.', seated: 'Seated on a low stool with a tray over their knees.', kneeling: 'Kneeling beside a low seed tray.', leaning: 'Standing with one elbow bent and the head down in concentration.' }),
    clothing: choice('What do they wear?', { apron: 'An ochre work apron over a pale shirt.', overalls: 'Blue gardening overalls.', cardigan: 'A warm red cardigan and dark trousers.', lab: 'A pale conservation coat and green trousers.' }),
    hair: choice('How is their hair kept out of the work?', { bun: 'Hair tied in a bun.', short: 'Short cropped hair.', cap: 'A practical cloth cap.', hat: 'A broad gardening hat.' }),
    age: score('What is the stature of the volunteer?', ['A young helper', 'A compact adult', 'A tall adult']),
    harvest: choice('What are they saving?', { beans: 'A handful of large mottled beans.', grains: 'A neat pile of golden grain.', flowers: 'Tiny dark wildflower seeds.', pods: 'Papery opened pods with seed spilling out.' }),
    notebook: noul('Is a small field notebook on the tray?'),
    badge: noul('Do they wear a seed-swap volunteer badge?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const height = 1.15 + a.age * 0.7;
    const person = figure(s, {
      height, style: 'doll', pose: a.posture === 'seated' ? 'sitting' : a.posture === 'kneeling' ? 'kneeling' : 'standing',
      hair: a.hair, gaze: 'down', skin: ['#d3a27f', '#8f6047', '#ba8058', '#e5bea0'][Math.floor(random() * 4)],
      top: { apron: '#ddd2b8', overalls: '#52788e', cardigan: '#a45d50', lab: '#deded2' }[a.clothing],
      bottom: a.clothing === 'lab' ? '#526453' : '#52594e', shoes: '#695346', sleeves: 'long',
    });
    s.root.add(person.root);
    if (a.posture === 'leaning' || a.task === 'sorting') { person.joints.spine.rotation.x = 0.15; person.settle(); }
    const wood = s.material('#a78b61'), paper = s.material('#e6d9b6'), seed = s.material(a.harvest === 'flowers' ? '#4b4033' : a.harvest === 'beans' ? '#a27859' : '#cbb171');
    person.root.updateMatrixWorld(true);
    const hip = person.pelvis.getWorldPosition(new THREE.Vector3());
    const trayY = a.posture === 'kneeling' ? hip.y - height * 0.015 : a.posture === 'seated' ? person.hipHeight + 0.16 : height * 0.54;
    const trayZ = a.posture === 'seated' ? 0.24 : 0.38;
    if (a.posture === 'seated') { const sh = Math.max(0.18, person.hipHeight - 0.04); s.cylinder(0.18, 0.18, 0.045, [hip.x, sh, hip.z], wood); for (const x of [-0.12, 0.12]) for (const z of [-0.12, 0.12]) s.rod([hip.x + x * 1.2, 0, hip.z + z * 1.2], [hip.x + x, sh, hip.z + z], 0.018, wood); }
    else for (const x of [-0.27, 0.27]) for (const z of [trayZ - 0.18, trayZ + 0.18]) s.rod([x * 1.1, 0, z], [x, trayY, z], 0.018, wood);
    s.box([0.64, 0.025, 0.44], [0, trayY, trayZ], wood);
    for (const x of [-0.32, 0.32]) s.box([0.015, 0.05, 0.44], [x, trayY + 0.025, trayZ], wood);
    for (const z of [trayZ - 0.22, trayZ + 0.22]) s.box([0.64, 0.05, 0.015], [0, trayY + 0.025, z], wood);
    s.box([0.59, 0.008, 0.39], [0, trayY + 0.018, trayZ], paper);
    for (let i = 0; i < 16 + Math.round(mood.density * 15); i++) s.ball([a.harvest === 'beans' ? 0.014 : 0.005, 0.004, a.harvest === 'pods' ? 0.03 : 0.01], [(random() - 0.5) * 0.4, trayY + 0.028, trayZ + (random() - 0.5) * 0.24], seed, 8).rotation.y = random() * 3;
    const target = new THREE.Vector3(-0.14, a.task === 'examining' ? hip.y + height * 0.28 : trayY + 0.08, a.task === 'examining' ? 0.25 : trayZ);
    person.reach('right', target, { space: s.root }); person.lookAt(target, s.root);
    person.reach('left', new THREE.Vector3(0.14, trayY + 0.06, trayZ), { space: s.root });
    if (a.task === 'packing') { s.box([0.12, 0.17, 0.012], [0.13, trayY + 0.1, trayZ], paper).rotation.x = -0.3; s.label('SAVE', 0.09, 0.04, [0.13, trayY + 0.1, trayZ + 0.035]); }
    if (a.task === 'brushing') { s.box([0.15, 0.025, 0.045], [target.x, trayY + 0.045, trayZ], wood); for (let i = 0; i < 7; i++) s.box([0.012, 0.018, 0.04], [target.x - 0.06 + i * 0.02, trayY + 0.025, trayZ], seed); }
    if (a.task === 'examining') { s.ring(0.045, 0.006, [target.x, target.y + 0.07, target.z], s.material('#655c4c')); s.rod(target.toArray() as [number, number, number], [target.x, target.y + 0.04, target.z], 0.006, wood); s.ball([0.016, 0.01, 0.01], [0.14, trayY + 0.065, trayZ], seed, 8); }
    if (a.clothing === 'apron') { const apron = s.box([height * 0.22, height * 0.3, 0.025], [0, height * 0.075, height * 0.075], s.material('#b79858')); person.joints.spine.add(apron); }
    if (a.badge) { const badge = s.label('SEED SWAP', 0.13, 0.05, [0.06, height * 0.21, height * 0.078]); person.joints.spine.add(badge); }
    if (a.notebook) { s.box([0.15, 0.018, 0.12], [-0.19, trayY + 0.035, trayZ + 0.09], s.material('#57766d')); s.label('FIELD NOTES', 0.13, 0.035, [-0.19, trayY + 0.046, trayZ + 0.09]).rotation.x = -Math.PI / 2; }
    return s.finish({ update: (dt, time) => person.update(dt, time) });
  },
});
