import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    section: choice('How is the colony revealed?', { cutaway: 'A vertical soil cutaway shows chambers.', mound: 'A low surface mound with a busy entrance.', log: 'A nest inside a fallen wood fragment.' }),
    size: score('How broad is the visible colony?', ['A tiny nest fragment', 'A small ant farm', 'A broad nest cutaway']),
    tunnels: score('How extensive is the tunnel network?', ['A few chambers linked by one tunnel', 'Several branching chambers', 'An intricate network of galleries']),
    workers: score('How many visible workers are active?', ['A few workers', 'A busy group', 'Many workers moving through galleries']),
    pigment: choice('What colour are the ants?', { black: 'Charcoal black ants.', red: 'Rust-red ants.', amber: 'Golden amber ants.' }),
    stores: noul('Are pale seeds stored in one chamber?'),
    queen: noul('Is a larger queen visible in the lower chamber?'),
    grass: noul('Do thin grass roots descend from the surface?'),
  },
  build(a, context) {
    const s = new Sculpture(context), width = 0.13 + a.size * 0.7, u = width / 2, earth = s.material(a.section === 'log' ? '#ac9472' : '#b7a27f'), tunnel = s.material('#877358'), ant = s.material({ black: '#5b655b', red: '#9f7960', amber: '#b29b68' }[a.pigment]), chambers: [number, number, number][] = [];
    if (a.section === 'mound') { s.ball([u, u * 0.33, u * 0.8], [0, u * 0.28, 0], earth, 20); s.ball([u * 0.17, u * 0.04, u * 0.13], [0, u * 0.59, 0], tunnel, 14); }
    else { s.box([width, width * 0.72, width * 0.18], [0, width * 0.36, 0], earth); const count = 3 + Math.round(a.tunnels * 4); for (let i = 0; i < count; i++) { const p: [number, number, number] = [(i % 2 ? -1 : 1) * u * (0.25 + context.random() * 0.34), width * (0.13 + i / count * 0.51), width * 0.094]; chambers.push(p); s.ball([u * 0.25, u * 0.095, u * 0.016], p, tunnel, 14); if (i > 0) { const prev = chambers[i - 1]; s.tube([prev, [prev[0] * 0.2, (p[1] + prev[1]) / 2, p[2]], p], u * 0.025, tunnel); } } s.tube([[0, width * 0.72, width * 0.094], [0, width * 0.58, width * 0.094], chambers.at(-1)!], u * 0.032, tunnel); }
    const insect = (at: [number, number, number], size: number, direction: number) => { const start = s.root.children.length, group = new THREE.Group(); s.ball([size * 0.32, size * 0.24, size * 0.48], [0, size * 0.27, -size * 0.46], ant, 8); s.ball([size * 0.21, size * 0.22, size * 0.25], [0, size * 0.3, size * 0.03], ant, 8); s.ball([size * 0.29, size * 0.23, size * 0.27], [0, size * 0.3, size * 0.43], ant, 8); for (const side of [-1, 1]) { for (let i = 0; i < 3; i++) s.tube([[0, size * 0.28, size * (0.2 - i * 0.2)], [side * size * 0.5, size * 0.2, size * (0.36 - i * 0.34)], [side * size * 0.62, 0, size * (0.45 - i * 0.4)]], size * 0.025, ant); s.tube([[side * size * 0.15, size * 0.36, size * 0.59], [side * size * 0.27, size * 0.5, size * 0.88], [side * size * 0.43, size * 0.52, size * 0.92]], size * 0.018, ant); } for (const part of s.root.children.slice(start)) group.add(part); group.position.set(...at); group.rotation.y = direction; if (a.section !== 'mound') group.rotation.x = Math.PI / 2; s.root.add(group); };
    const count = 3 + Math.round(a.workers * 10); for (let i = 0; i < count; i++) { if (a.section === 'mound') { const t = i * 2.4, rr = u * (0.2 + context.random() * 0.65); insect([Math.cos(t) * rr, u * 0.28 + u * 0.33 * Math.sqrt(Math.max(0, 1 - (rr / u) ** 2)), Math.sin(t) * rr * 0.8], u * 0.048, t); } else { const p = chambers[i % chambers.length]; insect([p[0] + (context.random() - 0.5) * u * 0.25, p[1], p[2] + u * 0.035], u * 0.042, context.random() * Math.PI); } }
    if (a.queen) insect(a.section === 'mound' ? [u * 0.25, u * 0.56, 0] : [chambers[0][0], chambers[0][1], chambers[0][2] + u * 0.035], u * 0.095, 0);
    if (a.stores) { const p = chambers.length ? chambers[1] : [u * 0.4, u * 0.5, u * 0.08], seed = s.material('#d8c8a0'); for (let i = 0; i < 10; i++) s.ball([u * 0.018, u * 0.01, u * 0.023], [p[0] + (context.random() - 0.5) * u * 0.22, p[1] + (context.random() - 0.5) * u * 0.1, p[2] + u * 0.035], seed, 8); }
    if (a.grass) { const green = s.material('#94a36e'); for (let i = 0; i < 7; i++) { const x = (i - 3) * u * 0.25, y = a.section === 'mound' ? u * 0.38 : width * 0.72; s.tube([[x, y, 0], [x + u * 0.08, y + u * 0.3, 0], [x + u * 0.02, y + u * 0.48, 0]], u * 0.01, green); if (a.section !== 'mound') s.tube([[x, y, width * 0.095], [x + u * 0.03, y - u * 0.25, width * 0.095], [x - u * 0.04, y - u * 0.4, width * 0.095]], u * 0.006, s.material('#c8b89b')); } }
    return s.finish();
  },
});
