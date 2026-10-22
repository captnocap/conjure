import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    bell: choice('What silhouette has the swimming bell?', { moon: 'A wide shallow moon-jelly dome.', lantern: 'A tall hanging lantern-shaped bell.', crown: 'A compact crown with a scalloped margin.' }),
    tint: choice('What colour is the jelly?', { pearl: 'Milk-white and pale lilac.', amber: 'Honey amber and burnt orange.', violet: 'Purple and pink.', ice: 'Icy cyan and ocean blue.' }),
    diameter: score('How broad is the bell?', ['A tiny fingertip jelly', 'A saucer-sized jelly', 'A large umbrella jelly']),
    trail: score('How far do the tentacles trail?', ['Short fringe', 'One bell diameter', 'Long trailing strands']),
    arms: choice('What oral arms hang beneath it?', { ribbons: 'Four thick curling ribbons.', frills: 'Six ruffled drooping arms.', none: 'Only a slender fringe of tentacles.' }),
    markings: noul('Are four internal horseshoe gonads visible on the bell?'),
    luminous: noul('Does its margin carry a soft bioluminescent glow?'),
    drift: choice('Which way does it drift?', { straight: 'Upright, tentacles hanging straight down.', left: 'Trailing to one side as if caught in a current.', spiral: 'Tentacles curl into a loose corkscrew.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.013 + a.diameter * 0.33, length = r * (0.6 + a.trail * 4.3), y = length + r * 0.15;
    const color = { pearl: '#dcd9ee', amber: '#deaa64', violet: '#aa82cc', ice: '#a0d7df' }[a.tint];
    const bell = s.material(color, { roughness: 0.27 }), fringe = s.material(color, { emissive: a.luminous ? color : '#000000', emissiveIntensity: a.luminous ? 0.45 : 0 }), core = s.material('#ac78a9');
    const tall = a.bell === 'lantern' ? 1 : a.bell === 'crown' ? 0.56 : 0.34;
    s.lathe([[0, y + r * tall], [r * 0.32, y + r * tall * 0.93], [r * 0.75, y + r * tall * 0.55], [r, y + r * 0.06], [r * 0.96, y], [0, y]], bell);
    const rim = s.ring(r * 0.98, r * 0.027, [0, y + r * 0.035, 0], fringe); rim.rotation.x = Math.PI / 2;
    if (a.markings) for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; const ring = s.ring(r * 0.17, r * 0.024, [Math.cos(t) * r * 0.3, y + r * tall * 0.92, Math.sin(t) * r * 0.3], core, Math.PI * 1.7); ring.rotation.x = Math.PI / 2; }
    const drift = a.drift === 'left' ? r * 1.5 : 0;
    for (let i = 0; i < 20; i++) { const t = i * Math.PI / 10, l = length * (0.6 + context.random() * 0.4), pts: [number, number, number][] = []; for (let j = 0; j < 7; j++) { const f = j / 6, twist = a.drift === 'spiral' ? f * 3 : 0; pts.push([Math.cos(t + twist) * r * (0.87 - f * 0.2) + Math.sin(f * 5 + i) * r * 0.1 - drift * f * f, y - l * f, Math.sin(t + twist) * r * (0.87 - f * 0.2)]); } s.tube(pts, r * 0.008, fringe); }
    if (a.arms !== 'none') for (let i = 0; i < (a.arms === 'frills' ? 6 : 4); i++) { const t = i * Math.PI * 2 / (a.arms === 'frills' ? 6 : 4), pts: [number, number, number][] = []; for (let j = 0; j < 8; j++) { const f = j / 7; pts.push([Math.cos(t + f * 1.8) * r * (0.2 + f * 0.15) - drift * f * 0.7, y - length * 0.7 * f, Math.sin(t + f * 1.8) * r * (0.2 + f * 0.15)]); } s.tube(pts, r * (a.arms === 'frills' ? 0.068 : 0.045), bell); if (a.arms === 'frills') pts.forEach((p, j) => { if (j > 0) s.ball([r * 0.11, r * 0.025, r * 0.07], p, fringe, 8); }); }
    const base = s.finish();
    const start = base.object.position.y;
    return { ...base, update: (_dt, time) => { base.object.position.y = start + Math.sin(time * (0.5 + context.mood.energy)) * r * 0.06; } };
  },
});
