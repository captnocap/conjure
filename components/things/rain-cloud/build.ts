import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    sky: choice('What shape is the rain cloud?', { low: 'A low broad rain cloud.', tower: 'A tall rounded storm tower.', shelf: 'A leading shelf cloud with a curved lip.' }),
    span: score('How wide is this storm fragment?', ['A small rain shower', 'A broad storm cell', 'A large weather front']),
    fall: choice('What precipitation falls?', { rain: 'Long thin rain streaks.', curtain: 'Several dense vertical rain curtains.', hail: 'Pale spherical hailstones.', snow: 'Small white snow grains.' }),
    reach: score('How far does precipitation fall beneath it?', ['Short trailing virga', 'A cloud-length shower', 'A long rain shaft']),
    tilt: choice('Which direction slants the rain?', { down: 'Straight down.', left: 'Slanting to the left.', right: 'Slanting to the right.' }),
    lightning: noul('Does a branching lightning bolt descend from the cloud?'),
    rim: noul('Is the leading cloud edge bright with silver lining?'),
  },
  build(a, context) {
    const s = new Sculpture(context), span = 40 + a.span * 650, fallHeight = span * (0.18 + a.reach * 0.75), baseY = fallHeight, dark = s.material('#929faa'), light = s.material('#c7d1d2'), precipitation = s.material(a.fall === 'hail' || a.fall === 'snow' ? '#dce1d6' : '#99afbd'), lean = a.tilt === 'left' ? -0.28 : a.tilt === 'right' ? 0.28 : 0;
    for (let i = 0; i < 19; i++) { const t = i * 2.4, radius = span * (0.085 + context.random() * 0.055), x = Math.cos(t) * span * 0.35, z = Math.sin(t) * span * 0.14, y = baseY + span * 0.07 + (a.sky === 'tower' ? Math.max(0, 1 - Math.abs(x) / (span * 0.4)) * span * 0.25 : context.random() * span * 0.05); s.ball([radius * 1.3, radius * (a.sky === 'low' ? 0.55 : 0.85), radius], [x, y, z], a.rim && i % 4 === 0 ? light : dark, 16); }
    if (a.sky === 'shelf') s.tube([[-span * 0.45, baseY + span * 0.02, span * 0.14], [0, baseY + span * 0.06, span * 0.21], [span * 0.45, baseY + span * 0.02, span * 0.14]], span * 0.055, a.rim ? light : dark);
    const drops: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 160; i++) { const f = context.random(), x = (context.random() - 0.5) * span * 0.7 + lean * fallHeight * (1 - f), z = (context.random() - 0.5) * span * 0.25, y = fallHeight * f; drops.push({ at: [x, y, z], size: span * (a.fall === 'snow' ? 0.0028 : a.fall === 'hail' ? 0.004 : 0.015 + context.random() * 0.015) }); }
    const dropGeometry = a.fall === 'hail' || a.fall === 'snow' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.CylinderGeometry(0.055, 0.055, 2.1, 5);
    const rain = s.scatter(dropGeometry, precipitation, drops); if (a.fall === 'rain' || a.fall === 'curtain') { const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan(lean)), scale = new THREE.Vector3(); drops.forEach((drop, i) => { scale.setScalar(drop.size); if (a.fall === 'curtain') scale.y *= 3; matrix.compose(new THREE.Vector3(...drop.at), rotation, scale); rain.setMatrixAt(i, matrix); }); rain.instanceMatrix.needsUpdate = true; }
    if (a.lightning) { const bolt = s.material('#ede2ab', { emissive: '#e8d48b', emissiveIntensity: 1 }), pts: [number, number, number][] = [[-span * 0.05, baseY, 0], [span * 0.035, baseY * 0.72, 0], [-span * 0.06, baseY * 0.62, 0], [span * 0.08, baseY * 0.34, 0], [span * 0.015, 0, 0]]; for (let i = 0; i < pts.length - 1; i++) s.rod(pts[i], pts[i + 1], span * 0.007, bolt, span * 0.004); s.rod(pts[2], [-span * 0.18, baseY * 0.42, span * 0.04], span * 0.004, bolt, span * 0.001); }
    return s.finish();
  },
});
