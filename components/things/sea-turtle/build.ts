import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    species: choice('What shape has the marine turtle?', { green: 'A smooth rounded green turtle.', hawksbill: 'An amber turtle with a pointed beak.', leatherback: 'A long dark turtle with raised shell ridges.' }),
    size: score('How large is the turtle?', ['A tiny hatchling', 'A young sea turtle', 'A large mature turtle']),
    shell: choice('What colours pattern its shell?', { olive: 'Olive and moss-green plates.', amber: 'Honey and brown plates.', slate: 'Dark slate-blue shell.' }),
    flippers: choice('What swimming pose are its flippers in?', { level: 'Broad flippers extended level.', down: 'Front paddles sweep downward.', rise: 'Front paddles lift upward.' }),
    plates: score('How pronounced are the shell plates?', ['A smooth domed shell', 'Clear hexagonal plate borders', 'Deep raised shell segments']),
    barnacles: noul('Do a few pale barnacles cling to the shell?'),
    tracks: noul('Are small sand impressions visible beneath a hatchling?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.075 + a.size * 1.45, u = length / 2, shell = s.material({ olive: '#86936d', amber: '#a28b62', slate: '#667f83' }[a.shell]), skin = s.material(a.species === 'leatherback' ? '#73888c' : '#a2ac7f'), seam = s.material('#657466'), y = u * 0.13;
    s.ball([u * 0.57, u * 0.25, u * (a.species === 'leatherback' ? 0.87 : 0.72)], [0, y, 0], shell, 24);
    s.ball([u * 0.49, u * 0.07, u * 0.63], [0, y - u * 0.1, 0], s.material('#c4c2a0'), 18);
    s.rod([0, y, u * 0.57], [0, y + u * 0.03, u * 0.91], u * 0.09, skin, u * 0.11);
    s.ball([u * 0.16, u * 0.13, u * 0.22], [0, y + u * 0.04, u * 1.04], skin, 16);
    if (a.species === 'hawksbill') s.ball([u * 0.085, u * 0.085, u * 0.16], [0, y - u * 0.015, u * 1.24], skin, 12);
    for (const side of [-1, 1]) { s.ball([u * 0.025, u * 0.027, u * 0.032], [side * u * 0.14, y + u * 0.09, u * 1.11], seam, 10); for (let pair = 0; pair < 2; pair++) { const front = pair === 0, fin = s.ball([u * (front ? 0.58 : 0.3), u * 0.027, u * (front ? 0.17 : 0.12)], [side * u * (front ? 0.79 : 0.52), y, u * (front ? 0.33 : -0.53)], skin, 18); fin.rotation.y = side * (front ? 0.45 : -0.55); fin.rotation.z = side * (a.flippers === 'rise' ? 0.45 : a.flippers === 'down' ? -0.35 : 0.05); } }
    s.rod([0, y, -u * 0.65], [0, y, -u * 0.92], u * 0.065, skin, u * 0.005);
    if (a.species === 'leatherback') for (let i = -2; i <= 2; i++) s.tube([[i * u * 0.16, y + u * 0.16, -u * 0.64], [i * u * 0.2, y + u * 0.27, 0], [i * u * 0.16, y + u * 0.16, u * 0.6]], u * 0.018, skin);
    else if (a.plates > 0.2) for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) { const x = col * u * 0.27, z = (row - 1) * u * 0.33, yy = y + u * 0.25 * Math.sqrt(Math.max(0, 1 - (x / (u * 0.61)) ** 2 - (z / (u * 0.8)) ** 2)), pts: [number, number, number][] = []; for (let j = 0; j < 6; j++) { const t = j * Math.PI / 3; pts.push([x + Math.cos(t) * u * 0.16, yy + u * 0.005, z + Math.sin(t) * u * 0.2]); } s.tube(pts, u * (0.006 + a.plates * 0.009), seam, true); }
    if (a.barnacles) for (let i = 0; i < 6; i++) { const t = i * 2.4, x = Math.cos(t) * u * 0.25, z = Math.sin(t) * u * 0.4, yy = y + u * 0.24 * Math.sqrt(Math.max(0, 1 - (x / (u * 0.6)) ** 2 - (z / (u * 0.8)) ** 2)); s.cylinder(u * 0.012, u * 0.032, u * 0.04, [x, yy, z], s.material('#d1cfb2'), 6); }
    if (a.tracks) for (let i = 0; i < 6; i++) for (const side of [-1, 1]) { const impression = s.ball([u * 0.15, u * 0.006, u * 0.06], [side * u * 0.55, 0, -u * (0.7 + i * 0.24)], s.material('#bbae83'), 8); impression.rotation.y = side * 0.5; }
    return s.finish();
  },
});
