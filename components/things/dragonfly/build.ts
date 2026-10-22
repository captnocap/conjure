import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    body: choice('What colours mark the dragonfly?', { blue: 'Sky-blue abdomen with dark bands.', red: 'Red abdomen and bronze thorax.', emerald: 'Metallic emerald green.', gold: 'Golden brown with pale stripes.' }),
    size: score('How large is the insect?', ['A small damselfly-sized insect', 'A garden dragonfly', 'A large tropical dragonfly']),
    wings: choice('How are the wings posed?', { cross: 'Four wings spread in a broad cross.', swept: 'Wings swept slightly backward.', roof: 'Wings lifted toward one another.' }),
    veining: score('How detailed is the wing lattice?', ['Only the leading edge', 'Visible cross veins', 'A dense geometric lattice']),
    tail: choice('How does the abdomen end?', { needle: 'A long needlelike tail.', club: 'A slightly swollen club tip.', fork: 'A slender forked tail tip.' }),
    wingmarks: noul('Do dark patches mark the tips of the wings?'),
    eyes: choice('What colour are the large eyes?', { green: 'Sage green compound eyes.', bronze: 'Bronze-brown eyes.', blue: 'Deep blue eyes.' }),
    perch: noul('Is it perched on a short reed stem?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.032 + a.size * 0.08, unit = length / 2, body = s.material({ blue: '#71a4c0', red: '#bb6350', emerald: '#56977b', gold: '#b99c5e' }[a.body], { metalness: a.body === 'emerald' ? 0.4 : 0.05 }), dark = s.material('#525c55'), glass = s.material('#d4ddca', { roughness: 0.32, side: THREE.DoubleSide }), y = unit * (a.perch ? 0.42 : 0.12);
    if (a.perch) s.rod([0, 0, 0], [0, y, unit * 0.15], unit * 0.025, s.material('#8c9a5b'));
    s.ball([unit * 0.11, unit * 0.1, unit * 0.2], [0, y, unit * 0.18], body, 14);
    for (let i = 0; i < 10; i++) { const z = -i * unit * 0.083, r = unit * (0.07 - i * 0.0036); s.ball([r, r * 0.8, unit * 0.057], [0, y, z], i % 3 === 0 ? dark : body, 10); }
    const end = -unit * 0.85;
    if (a.tail === 'club') s.ball([unit * 0.075, unit * 0.052, unit * 0.075], [0, y, end], body, 10);
    if (a.tail === 'fork') for (const side of [-1, 1]) s.rod([0, y, end], [side * unit * 0.045, y, end - unit * 0.12], unit * 0.014, dark, unit * 0.005);
    const eye = s.material({ green: '#8fa57e', bronze: '#a89967', blue: '#688f9f' }[a.eyes], { roughness: 0.26 });
    for (const side of [-1, 1]) {
      s.ball([unit * 0.092, unit * 0.085, unit * 0.09], [side * unit * 0.07, y + unit * 0.025, unit * 0.39], eye, 12);
      for (let i = 0; i < 3; i++) s.tube([[side * unit * 0.06, y, unit * (0.27 - i * 0.08)], [side * unit * 0.2, y * 0.55, unit * (0.35 - i * 0.13)], [side * unit * 0.16, y * 0.1, unit * (0.4 - i * 0.12)]], unit * 0.012, dark);
      for (let pair = 0; pair < 2; pair++) {
        const z = pair === 0 ? unit * 0.25 : unit * 0.06, reach = unit * (pair ? 0.98 : 1.12), sweep = a.wings === 'swept' ? -unit * 0.3 : pair ? -unit * 0.17 : unit * 0.12, start = s.root.children.length, group = new THREE.Group();
        const wing = s.ball([reach * 0.54, unit * 0.008, unit * 0.135], [reach * 0.56, unit * 0.06, sweep], glass, 20); wing.rotation.y = -Math.atan2(sweep, reach);
        s.rod([0, unit * 0.062, 0], [reach, unit * 0.062, sweep + unit * 0.07], unit * 0.007, dark);
        const count = 2 + Math.round(a.veining * 9);
        for (let j = 1; j < count; j++) { const f = j / count, x = reach * f, half = unit * 0.13 * Math.sin(Math.PI * f); s.rod([x, unit * 0.07, sweep * f - half], [x + reach / count * 0.45, unit * 0.07, sweep * f + half], unit * 0.003, dark); if (a.veining > 0.6) s.rod([x, unit * 0.073, sweep * f], [x + reach / count, unit * 0.073, sweep * f + half * 0.45], unit * 0.0025, dark); }
        if (a.wingmarks) s.ball([unit * 0.08, unit * 0.013, unit * 0.035], [reach * 0.86, unit * 0.07, sweep * 0.85], dark, 8);
        for (const part of s.root.children.slice(start)) group.add(part); group.position.set(0, y, z); group.scale.x = side; group.rotation.z = side * (a.wings === 'roof' ? 0.85 : 0.04); s.root.add(group);
      }
    }
    return s.finish();
  },
});
