import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    fossil: choice('What fossil is held inside the jacket?', { spine: 'A row of heavy vertebrae with short ribs.', jaw: 'A curved jaw with a row of triangular teeth.', paddle: 'A paddle limb with many close finger bones.', eggs: 'A cluster of rounded fossil eggs in their nest.' }),
    opening: choice('How far has the protective jacket been opened?', { open: 'The whole top is cut away, leaving a white rim.', half: 'One end is still enclosed under plaster.', window: 'A small preparation window exposes the centre.', closed: 'A detached plaster lid lies beside the open jacket.' }),
    cradle: choice('What supports the heavy specimen?', { sled: 'A low wooden transport sled.', trestle: 'Two stout cross brace trestles.', trolley: 'A steel trolley on four small wheels.', beams: 'Two broad timber beams with padded cross pieces.' }),
    wrapping: choice('What reinforces the field jacket?', { white: 'Clean white plaster bandages.', burlap: 'Coarse brown burlap visible under the plaster.', canvas: 'Cream canvas patches and broad seams.', ochre: 'Dust stained pale ochre plaster.' }),
    size: score('How large is the recovered block?', ['A small carryable fragment', 'A broad two person block', 'A heavy long excavation block']),
    straps: score('How many retaining straps cross the cradle?', ['One strap at the end', 'Two straps', 'Four transport straps']),
    state: choice('What stage of conservation is visible?', { fresh: 'Loose matrix chips remain from opening the jacket.', mapped: 'Coloured marker pins mark small finds.', consolidated: 'Dark glossy patches mark stabilised bone.', repaired: 'Pale conservation fills bridge fractures.' }),
    marking: choice('What field marking identifies the block?', { grid: 'A black excavation square and north arrow.', number: 'A large accession number.', fragile: 'Red fragile arrows and a transport mark.', none: 'No visible lettering, only the raw field jacket.' }),
    tools: noul('Are a flat brush and wooden preparation sticks laid on the cradle?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const length = 0.55 + a.size * 0.65, width = 0.44 + a.size * 0.12;
    const wood = s.material('#967548'), metal = s.material('#647872', { metalness: 0.48 }), plaster = s.material({ white: '#e6e0ce', burlap: '#c4b18a', canvas: '#ded3b3', ochre: '#cdbb8e' }[a.wrapping]);
    const matrix = s.material('#927b57'), bone = s.material('#624b35', { roughness: a.state === 'consolidated' ? 0.22 : 0.8 }), strap = s.material('#6d6950');
    const base = a.cradle === 'trestle' ? 0.3 : a.cradle === 'trolley' ? 0.15 : 0.075;
    for (const x of [-width * 0.43, width * 0.43]) s.box([0.055, 0.07, length + 0.16], [x, base - 0.035, 0], a.cradle === 'trolley' ? metal : wood);
    for (const z of [-length * 0.36, length * 0.36]) {
      s.box([width + 0.14, 0.045, 0.065], [0, base + 0.012, z], wood);
      if (a.cradle === 'trestle') for (const side of [-1, 1]) s.rod([side * width * 0.48, 0.02, z], [-side * width * 0.28, base, z], 0.025, wood);
      if (a.cradle === 'trolley') for (const x of [-width * 0.43, width * 0.43]) { s.rod([x, 0.065, z], [x, base, z], 0.015, metal); s.cylinder(0.045, 0.045, 0.025, [x, 0.047, z], strap, 16).rotation.z = Math.PI / 2; }
    }
    const y = base + 0.11, rx = width * 0.5, rz = length * 0.5;
    plaster.side = THREE.DoubleSide;
    s.surface((u, v, p) => { const t = u * Math.PI * 2; p.set(Math.cos(t) * rx * v, y - 0.06 + v * v * 0.13, Math.sin(t) * rz * v); }, plaster, { segments: [48, 12], wrap: true, flip: true });
    s.cylinder(rx * 0.92, rx * 0.88, 0.025, [0, y + 0.075, 0], matrix, 28).scale.z = rz / rx;
    const rim: [number, number, number][] = [];
    for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2, jitter = 1 + Math.sin(t * 7) * 0.02; rim.push([Math.cos(t) * rx * 0.94 * jitter, y + 0.076 + Math.sin(t * 11) * 0.004, Math.sin(t) * rz * 0.95 * jitter]); }
    s.tube(rim, 0.016, plaster);
    if (a.wrapping === 'burlap' || a.wrapping === 'canvas') for (let j = 0; j < 7; j++) { const z = -rz * 0.75 + j * rz * 0.25; s.tube([[-rx * 0.94, y + 0.02, z], [-rx * 0.72, y - 0.055, z], [rx * 0.72, y - 0.055, z], [rx * 0.94, y + 0.02, z]], a.wrapping === 'burlap' ? 0.003 : 0.008, s.material('#9f8e69')); }
    const fy = y + 0.1;
    if (a.fossil === 'spine') for (let j = 0; j < 8; j++) {
      const z = (j - 3.5) * length * 0.08, x = Math.sin(j * 0.65) * width * 0.08;
      s.cylinder(0.038, 0.036, 0.035, [x, fy + 0.018, z], bone, 12).rotation.x = Math.PI / 2;
      s.rod([x, fy + 0.025, z], [x, fy + 0.09, z - 0.01], 0.013, bone, 0.006);
      for (const side of [-1, 1]) s.tube([[x, fy + 0.01, z], [x + side * width * 0.2, fy + 0.01, z - 0.02], [x + side * width * 0.32, fy - 0.007, z - 0.045]], 0.009, bone);
    }
    if (a.fossil === 'jaw') { const path: [number, number, number][] = []; for (let j = 0; j <= 22; j++) { const t = -1.4 + j / 22 * 2.8; path.push([Math.cos(t) * width * 0.28 - width * 0.12, fy, Math.sin(t) * length * 0.34]); } s.tube(path, 0.026, bone); for (let j = 0; j < 11; j++) { const t = -1.3 + j * 0.26; s.cylinder(0.001, 0.013, 0.06, [Math.cos(t) * width * 0.28 - width * 0.12, fy + 0.038, Math.sin(t) * length * 0.34], s.material('#b6a078'), 4); } }
    if (a.fossil === 'paddle') { s.rod([0, fy, -length * 0.33], [0, fy, -length * 0.03], 0.03, bone); for (let finger = 0; finger < 5; finger++) for (let j = 0; j < 5; j++) { const x = (finger - 2) * width * 0.07 * (0.6 + j * 0.14), z = j * length * 0.065; s.ball([0.014, 0.012, length * 0.025], [x, fy + 0.005, z], bone, 10); } }
    if (a.fossil === 'eggs') for (let j = 0; j < 7; j++) { const t = j / 6 * Math.PI * 2, r = j === 6 ? 0 : 1; const egg = s.ball([width * 0.115, 0.038, length * 0.09], [Math.cos(t) * width * 0.27 * r, fy, Math.sin(t) * length * 0.26 * r], bone, 16); egg.rotation.y = t * 0.4; }
    if (a.opening === 'half' || a.opening === 'window') { const closedLength = a.opening === 'half' ? 0.38 : 0.3; s.ball([rx, 0.12, rz * closedLength], [0, y + 0.04, -rz * (1 - closedLength)], plaster, 18); if (a.opening === 'window') s.ball([rx, 0.12, rz * 0.3], [0, y + 0.04, rz * 0.7], plaster, 18); }
    if (a.opening === 'closed') { const lid = s.ball([rx, 0.055, rz], [width + 0.12, 0.065, 0], plaster, 18); lid.rotation.z = -0.2; }
    const n = 1 + Math.round(a.straps * 3);
    for (let j = 0; j < n; j++) { const z = n === 1 ? -rz * 0.83 : -rz * 0.85 + j / (n - 1) * rz * 1.7; s.tube([[-rx * 1.1, base, z], [-rx, y + 0.07, z], [-rx * 0.65, y + 0.115, z], [rx * 0.65, y + 0.115, z], [rx, y + 0.07, z], [rx * 1.1, base, z]], 0.009, strap); }
    if (a.state === 'fresh') for (let j = 0; j < 12; j++) s.ball([0.012, 0.006, 0.01], [(rnd() - 0.5) * width * 0.7, y + 0.09, (rnd() - 0.5) * length * 0.7], matrix, 6);
    if (a.state === 'mapped') for (let j = 0; j < 5; j++) { const x = (j % 2 ? 1 : -1) * width * 0.32, z = (j - 2) * length * 0.12; s.rod([x, y + 0.09, z], [x, y + 0.15, z], 0.002, metal); s.ball([0.008, 0.008, 0.008], [x, y + 0.15, z], s.material(j % 2 ? '#ac4a32' : '#d6b84b'), 8); }
    if (a.state === 'repaired') s.tube([[-width * 0.3, fy + 0.006, 0], [0, fy + 0.027, 0.02], [width * 0.3, fy + 0.006, -0.01]], 0.005, s.material('#e4d8ba'));
    if (a.marking !== 'none') s.label({ grid: 'N ↑ / B 7', number: 'NHM 0042', fragile: '↑ FRAGILE ↑' }[a.marking], width * 0.66, 0.07, [0, y, rz * 0.94], a.marking === 'fragile' ? '#9e402b' : '#3b3a30', '#ded4b6');
    if (a.tools) { s.rod([-width * 0.6, base + 0.045, -0.16], [-width * 0.6, base + 0.045, 0.08], 0.009, wood); s.box([0.035, 0.013, 0.055], [-width * 0.6, base + 0.045, 0.11], matrix); }
    return s.finish();
  },
});
