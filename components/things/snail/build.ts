import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    shell: choice('What shell does the snail carry?', { round: 'A broad rounded garden shell.', tall: 'A taller pointed spiral shell.', flat: 'A flattened disk-like ramshorn shell.' }),
    pigment: choice('What marks the shell?', { ochre: 'Golden ochre with brown bands.', cream: 'Cream with cinnamon bands.', green: 'Olive green and pale stripes.', rose: 'Muted rose with ivory bands.' }),
    size: score('How long is the snail?', ['A tiny young snail', 'A common garden snail', 'A large land snail']),
    feelers: choice('How are its feelers held?', { searching: 'Long feelers extend inquisitively.', alert: 'Both upper feelers point upward.', tucked: 'Short feelers are partially tucked in.' }),
    bands: score('How strongly do spiral bands stand out?', ['Subtle shell lines', 'Clear dark bands', 'Bold raised spiral ridges']),
    trail: noul('Does a silvery slime trail follow behind the foot?'),
    leaf: noul('Is it gliding over a small green leaf?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.018 + a.size * 0.12, u = length / 2, flesh = s.material('#b9b79a'), shell = s.material({ ochre: '#b6a06c', cream: '#d2c4a2', green: '#94a27b', rose: '#b99890' }[a.pigment]), band = s.material('#8f7b5d'), dark = s.material('#57665b'), bodyY = u * 0.12;
    if (a.leaf) { const l = s.ball([u * 1.3, u * 0.015, u * 0.52], [0, u * 0.014, 0], s.material('#8f9e68'), 18); l.rotation.y = -0.3; }
    s.ball([u * 0.25, u * 0.115, u * 0.95], [0, bodyY, 0], flesh, 20);
    s.ball([u * 0.19, u * 0.2, u * 0.25], [0, bodyY + u * 0.12, u * 0.63], flesh, 14);
    const height = a.shell === 'tall' ? u * 0.72 : u * 0.5, z = -u * 0.2, core = s.ball([u * (a.shell === 'flat' ? 0.17 : 0.46), height, u * 0.46], [0, bodyY + height * 0.95, z], shell, 22); core.rotation.z = a.shell === 'tall' ? -0.12 : 0;
    for (const side of [-1, 1]) { const pts: [number, number, number][] = []; for (let i = 0; i < 70; i++) { const f = i / 69, t = f * Math.PI * 5.2, radius = u * (0.04 + f * 0.4); pts.push([side * u * (a.shell === 'flat' ? 0.17 : 0.4) * Math.sqrt(Math.max(0.1, 1 - (radius / (u * 0.49)) ** 2)), bodyY + height * 0.98 + Math.cos(t) * radius * height / (u * 0.46), z + Math.sin(t) * radius]); } s.tube(pts, u * (0.005 + a.bands * 0.012), band); const extend = a.feelers === 'tucked' ? 0.5 : 1, yy = bodyY + u * 0.25; s.tube([[side * u * 0.08, yy, u * 0.74], [side * u * 0.18, yy + u * 0.2 * extend, u * 0.88], [side * u * 0.22 * extend, yy + u * (a.feelers === 'alert' ? 0.46 : 0.27) * extend, u * (0.9 + 0.25 * extend)]], u * 0.012, flesh); s.ball([u * 0.018, u * 0.018, u * 0.018], [side * u * 0.22 * extend, yy + u * (a.feelers === 'alert' ? 0.46 : 0.27) * extend, u * (0.9 + 0.25 * extend)], dark, 8); s.rod([side * u * 0.08, bodyY + u * 0.05, u * 0.78], [side * u * 0.22, bodyY + u * 0.09, u * 1.05], u * 0.008, flesh, u * 0.004); }
    if (a.trail) s.tube([[0, u * 0.003, -u * 0.9], [u * 0.06, u * 0.003, -u * 1.2], [-u * 0.08, u * 0.003, -u * 1.65]], u * 0.065, s.material('#cbd4c3', { roughness: 0.2 }));
    return s.finish();
  },
});
