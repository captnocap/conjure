import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    form: choice('What shell architecture is it?', { scallop: 'A broad fan-shaped scallop valve.', spiral: 'A low coiled moon-snail shell.', conch: 'A long tapering spiral conch.' }),
    size: score('How large is the shell?', ['A fingernail fragment', 'A palm-sized shell', 'A large collectible shell']),
    pigment: choice('What colours cover its surface?', { cream: 'Ivory and cream.', peach: 'Peach pink and coral.', striped: 'Alternating brown and cream bands.', purple: 'Dusky purple fading to lilac.' }),
    ribbing: score('How pronounced is the surface ribbing?', ['Smooth polished surface', 'Fine ribs', 'Heavy raised flutes']),
    lip: noul('Does a thick pearly rim frame the opening?'),
    open: noul('Is the dark interior cavity clearly exposed?'),
    chips: noul('Is one small edge chipped from its time on the shore?'),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.01 + a.size * 0.15, outer = s.material({ cream: '#e3d9c4', peach: '#d99d88', striped: '#d5c4a8', purple: '#a99abb' }[a.pigment], { roughness: 0.45 }), pearl = s.material('#f0e5ce', { roughness: 0.24 }), dark = s.material('#716054'), stripe = s.material('#987458');
    if (a.form === 'scallop') {
      const positions: number[] = [], indices: number[] = [];
      for (let row = 0; row <= 12; row++) for (let col = 0; col <= 36; col++) { const f = row / 12, t = -Math.PI * 0.4 + col / 36 * Math.PI * 0.8, ridge = 1 + Math.cos(col / 36 * Math.PI * 26) * a.ribbing * 0.045; positions.push(Math.sin(t) * r * f, r * (0.05 + Math.sin(f * Math.PI) * 0.17 * ridge), Math.cos(t) * r * f - r * 0.5); if (row < 12 && col < 36) { const k = row * 37 + col; indices.push(k, k + 37, k + 1, k + 1, k + 37, k + 38); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); outer.side = THREE.DoubleSide; s.mesh(g, outer);
      for (let i = 0; i < 14; i++) { const t = -1.2 + i * 2.4 / 13, pts: [number, number, number][] = []; for (let j = 0; j < 8; j++) { const f = 0.15 + j * 0.85 / 7; pts.push([Math.sin(t) * r * f, r * (0.055 + Math.sin(f * Math.PI) * 0.18), Math.cos(t) * r * f - r * 0.5]); } if (!(a.chips && i === 13)) s.tube(pts, r * (0.003 + a.ribbing * 0.009), a.pigment === 'striped' && i % 3 === 0 ? stripe : pearl); }
      s.ball([r * 0.24, r * 0.04, r * 0.1], [0, r * 0.04, -r * 0.45], pearl, 12);
    } else {
      const turns = a.form === 'conch' ? 4 : 2.5, pts: [number, number, number][] = [];
      for (let j = 0; j < 65; j++) { const f = j / 64, t = f * Math.PI * 2 * turns, radius = r * (0.04 + f * 0.65); pts.push([Math.cos(t) * radius, r * (a.form === 'conch' ? (1 - f) * 1.8 + 0.32 : (1 - f) * 0.42 + 0.35), Math.sin(t) * radius]); }
      for (let j = 0; j < pts.length - 1; j++) { const f = j / 64; s.rod(pts[j], pts[j + 1], r * (0.025 + f * 0.18), a.pigment === 'striped' && j % 7 < 2 ? stripe : outer, r * (0.028 + f * 0.18)); }
      const last = pts.at(-1)!; const mouth = s.ball([r * 0.27, r * 0.17, r * 0.035], [last[0], last[1], last[2] + r * 0.08], a.open ? dark : pearl, 20); mouth.rotation.z = -0.35;
      if (a.lip) { const rim = s.ring(r * 0.23, r * 0.028, [last[0], last[1], last[2] + r * 0.1], pearl, a.chips ? Math.PI * 1.8 : Math.PI * 2); rim.scale.y = 0.65; rim.rotation.z = -0.35; }
      if (a.ribbing > 0.2) for (let i = 0; i < 12; i++) { const p = pts[35 + i * 2]; const rib = s.ring(r * (0.12 + i * 0.005), r * 0.005 * a.ribbing, p, pearl); rib.rotation.y = i * 0.4; }
    }
    return s.finish();
  },
});
