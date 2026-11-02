import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    frame: choice('What sort of winnower is this?', { oak: 'An old oak machine with iron straps.', painted: 'A green farm co-operative machine with cream lettering.', pale: 'A newly built plywood workshop demonstration.', red: 'A red iron experimental seed cleaner.' }),
    hopper: choice('How does seed enter the machine?', { square: 'A broad square funnel above the sorting deck.', round: 'A conical metal hopper with a narrow throat.', tray: 'An open shallow feeding tray inclined toward the drum.', bag: 'A cloth feed sack held open over a square funnel.' }),
    wheel: choice('How is it driven?', { spokes: 'A large exposed six-spoke flywheel and hand crank.', disc: 'A solid painted wheel with a wooden turning handle.', pulley: 'A double belt pulley and a small crank.', treadle: 'A large spoked wheel linked to a foot treadle.' }),
    state: choice('What is happening to the crop?', { ready: 'Empty and swept clean, ready for the first batch.', working: 'Golden seed runs into a waiting pan and chaff into another.', jammed: 'Straw is caught visibly in the feed throat.', rescued: 'A tiny valuable batch is being collected into a glass jar.' }),
    chute: choice('How does the sorted seed leave?', { twin: 'Two branching wooden channels.', long: 'One long metal slide and a short chaff outlet.', bags: 'Two short square outlets ending over cloth sacks.', drawers: 'Two flat removable collecting drawers.' }),
    opening: score('How far is the sorting inspection hatch open?', ['Fully closed', 'A narrow inspection gap', 'Lifted wide to show the comb']),
    capacity: score('How large is the hopper?', ['A tabletop test batch', 'A farm hand-crank machine', 'A broad shared harvest machine']),
    label: noul('Is a painted seed-cooperative badge attached?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { mood, random } = context;
    const body = s.material({ oak: '#997047', painted: '#4e735c', pale: '#cbb58a', red: '#a44937' }[a.frame]);
    const iron = s.material('#505753', { metalness: 0.7, roughness: 0.45 });
    const wood = s.material('#bb9561'), straw = s.material('#d0b16b'), dark = s.material('#423c2f');
    const w = 0.72 + a.capacity * 0.35, depth = 0.7;
    for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) for (const z of [-0.28, 0.28]) s.rod([x * 1.08, 0, z * 1.15], [x, 0.82, z], 0.045, body);
    for (const z of [-0.28, 0.28]) s.rod([-w / 2, 0.25, z], [w / 2, 0.65, z], 0.018, iron);
    s.box([w, 0.32, depth], [0, 0.76, 0], body);
    s.cylinder(0.25, 0.25, w + 0.04, [0, 0.77, 0], iron, 24).rotation.z = Math.PI / 2;
    s.box([w + 0.03, 0.055, 0.78], [0, 0.98, 0], wood);
    const lid = s.box([w * 0.6, 0.025, 0.25], [0, 1.01 + a.opening * 0.15, 0.21 - a.opening * 0.08], body); lid.rotation.x = -a.opening * 1.15;
    if (a.opening > 0.12) for (let i = 0; i < 13; i++) s.rod([-w * 0.25 + i * w * 0.5 / 12, 0.99, 0.05], [-w * 0.25 + i * w * 0.5 / 12, 0.99, 0.29], 0.006, iron);
    if (a.hopper === 'round') s.lathe([[0.1, 0], [0.1, 0.1], [0.34, 0.45], [0.35, 0.45], [0.11, 0.09], [0.11, 0]], iron, [0, 1.01, -0.12]);
    else {
      const hw = a.hopper === 'tray' ? w * 0.48 : w * 0.37, hh = a.hopper === 'tray' ? 0.12 : 0.36;
      s.box([hw * 2, 0.025, 0.45], [0, 1.1, -0.14], wood).rotation.x = -0.12;
      for (const sign of [-1, 1]) s.box([0.025, hh, 0.5], [sign * hw, 1.1 + hh / 2, -0.14], body).rotation.z = -sign * 0.18;
      for (const z of [-0.39, 0.11]) s.box([hw * 2, hh, 0.025], [0, 1.1 + hh / 2, z], body);
      if (a.hopper === 'bag') {
        s.lathe([[hw * 0.62, 0], [hw * 0.81, 0.12], [hw * 0.74, 0.36], [hw * 0.82, 0.42]], s.material('#c6bb9d', { side: THREE.DoubleSide }), [0, 1.32, -0.14]);
        s.ring(hw * 0.82, 0.015, [0, 1.74, -0.14], dark).rotation.x = Math.PI / 2;
      }
    }
    const wheel = new THREE.Group(), radius = a.wheel === 'pulley' ? 0.22 : 0.35;
    const ring = s.ring(radius, 0.029, [0, 0, 0], iron); wheel.add(ring); ring.rotation.y = Math.PI / 2;
    if (a.wheel === 'disc') { const disc = s.cylinder(radius - 0.02, radius - 0.02, 0.035, [0, 0, 0], body); disc.rotation.z = Math.PI / 2; wheel.add(disc); }
    else for (let i = 0; i < 6; i++) { const theta = i * Math.PI / 3; const rod = s.rod([0, 0, 0], [0, Math.sin(theta) * radius, Math.cos(theta) * radius], 0.018, iron); wheel.add(rod); }
    wheel.add(s.rod([0, 0, radius * 0.65], [0.16, 0, radius * 0.65], 0.025, wood));
    wheel.position.set(w / 2 + 0.12, 0.74, 0); s.root.add(wheel);
    if (a.wheel === 'pulley') { s.ring(radius * 0.65, 0.025, [w / 2 + 0.19, 0.74, 0], iron).rotation.y = Math.PI / 2; s.rod([w / 2 + 0.19, 0.52, 0.02], [w / 2 + 0.19, 0.18, -0.23], 0.01, dark); }
    if (a.wheel === 'treadle') { s.box([0.5, 0.035, 0.22], [0.12, 0.12, 0.4], wood).rotation.x = 0.2; s.rod([0.35, 0.15, 0.4], [w / 2 + 0.1, 0.5, 0.2], 0.012, iron); }
    for (const side of [-1, 1]) {
      const length = a.chute === 'long' && side > 0 ? 0.67 : 0.38, cx = side * w * 0.25;
      s.box([0.25, 0.025, length], [cx, 0.49, 0.35 + length / 2], a.chute === 'long' ? iron : wood).rotation.x = 0.4;
      for (const dx of [-0.12, 0.12]) s.box([0.018, 0.09, length], [cx + dx, 0.54, 0.35 + length / 2], body).rotation.x = 0.4;
      const z = 0.55 + length * 0.65;
      if (a.chute === 'bags') s.lathe([[0.15, 0], [0.19, 0.08], [0.14, 0.3], [0.18, 0.34]], s.material('#bbad88', { side: THREE.DoubleSide }), [cx, 0, z]);
      else { s.box([0.31, 0.025, 0.37], [cx, 0.02, z], iron); for (const dx of [-0.15, 0.15]) s.box([0.02, 0.08, 0.37], [cx + dx, 0.05, z], wood); }
      if (a.state === 'working') for (let i = 0; i < 22; i++) s.ball([0.009, 0.006, side > 0 ? 0.012 : 0.035], [cx + (random() - 0.5) * 0.22, 0.04 + random() * 0.02, z + (random() - 0.5) * 0.22], straw, 8);
    }
    if (a.state === 'jammed') for (let i = 0; i < 16; i++) s.rod([(random() - 0.5) * 0.4, 1.12, -0.1], [(random() - 0.5) * 0.7, 1.35 + random() * 0.23, random() * 0.22], 0.006, straw);
    if (a.state === 'rescued') { s.cylinder(0.07, 0.07, 0.2, [0.22, 0.12, 0.9], s.material('#b7c7bd', { transparent: true, opacity: 0.4, depthWrite: false })); s.cylinder(0.06, 0.06, 0.09, [0.22, 0.07, 0.9], straw); }
    if (a.label) s.label('SEED CO-OP', w * 0.7, 0.12, [0, 0.78, 0.357]);
    return s.finish({ update: (dt) => { if (a.state === 'working') wheel.rotation.x += dt * (0.2 + mood.energy * 1.4); } });
  },
});
