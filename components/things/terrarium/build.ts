import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    vessel: choice('What glass vessel holds the garden?', { globe: 'A round glass globe with a circular opening.', jar: 'A tall cylindrical jar.', geometric: 'A faceted brass-framed glass case.' }),
    size: score('How large is the enclosed garden?', ['A small desk terrarium', 'A substantial tabletop garden', 'A large interior display']),
    planting: choice('What miniature landscape grows inside?', { moss: 'Low moss hummocks and one tiny fern.', desert: 'Succulent rosettes in pale gravel.', woodland: 'Small leafy plants around a central stone.' }),
    layers: score('How visible are the soil strata?', ['One dark soil layer', 'Gravel and soil layers', 'Several alternating soil and sand bands']),
    feature: choice('What detail anchors the landscape?', { stone: 'One grey garden stone.', wood: 'A small piece of sculptural driftwood.', path: 'A winding line of stepping stones.' }),
    lid: noul('Does a cork lid close the vessel?'),
    condensation: noul('Do small condensation beads mark the rear glass?'),
    sprout: noul('Has a tall new shoot reached toward the opening?'),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.085 + a.size * 0.38, h = r * (a.vessel === 'jar' ? 2.5 : 2), glass = s.material('#bbd2ce', { transparent: true, opacity: 0.17, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide }), rim = s.material(a.vessel === 'geometric' ? '#b6a17b' : '#bed0c8', { metalness: 0.25 }), soil = s.material('#8b7b62'), green = s.material('#829d66'), baseY = r * 0.25;
    if (a.vessel === 'globe') { const shell = s.mesh(new THREE.SphereGeometry(r, 32, 20, Math.PI, Math.PI, 0.24, Math.PI - 0.42), glass, [0, r, 0]); shell.castShadow = false; const lip = s.ring(r * 0.26, r * 0.022, [0, r * 1.96, 0], rim); lip.rotation.x = Math.PI / 2; }
    else if (a.vessel === 'jar') { const shell = s.mesh(new THREE.CylinderGeometry(r * 0.83, r * 0.83, h, 32, 1, true, Math.PI / 2, Math.PI), glass, [0, h / 2, 0]); shell.castShadow = false; for (const y of [r * 0.04, h]) { const lip = s.ring(r * 0.83, r * 0.025, [0, y, 0], rim); lip.rotation.x = Math.PI / 2; } }
    else { for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3, next = (i + 1) * Math.PI / 3, p: [number, number, number] = [Math.cos(t) * r, r * 0.05, Math.sin(t) * r], q: [number, number, number] = [Math.cos(t) * r, r * 1.3, Math.sin(t) * r], top: [number, number, number] = [Math.cos(t) * r * 0.35, h, Math.sin(t) * r * 0.35]; s.rod(p, q, r * 0.018, rim); s.rod(q, top, r * 0.018, rim); s.rod(q, [Math.cos(next) * r, r * 1.3, Math.sin(next) * r], r * 0.018, rim); s.rod(top, [Math.cos(next) * r * 0.35, h, Math.sin(next) * r * 0.35], r * 0.018, rim); } }
    const strata = 1 + Math.round(a.layers * 3); for (let i = 0; i < strata; i++) s.cylinder(r * 0.75, r * 0.73, baseY / strata, [0, (i + 0.5) * baseY / strata, 0], i % 2 ? s.material('#c2b18c') : soil, 32);
    for (let i = 0; i < 8; i++) { const t = i * 2.4, rr = r * (0.22 + context.random() * 0.34), x = Math.cos(t) * rr, z = Math.sin(t) * rr; if (a.planting === 'moss') s.ball([r * 0.22, r * 0.085, r * 0.18], [x, baseY + r * 0.035, z], green, 12); else if (a.planting === 'desert') for (let j = 0; j < 7; j++) { const u = j * Math.PI * 2 / 7, leaf = s.ball([r * 0.11, r * 0.017, r * 0.032], [x + Math.cos(u) * r * 0.09, baseY + r * 0.08, z + Math.sin(u) * r * 0.09], green, 10); leaf.rotation.y = -u; leaf.rotation.z = 0.25; } else { const height = r * (0.25 + context.random() * 0.4); s.rod([x, baseY, z], [x, baseY + height, z], r * 0.012, green); for (let j = 0; j < 4; j++) { const u = j * Math.PI / 2; const leaf = s.ball([r * 0.12, r * 0.013, r * 0.045], [x + Math.cos(u) * r * 0.08, baseY + height * (0.4 + j * 0.16), z + Math.sin(u) * r * 0.08], green, 10); leaf.rotation.y = -u; } } }
    if (a.feature === 'stone') s.ball([r * 0.24, r * 0.28, r * 0.19], [r * 0.12, baseY + r * 0.21, -r * 0.1], s.material('#a5aea0', { flatShading: true }), 7);
    else if (a.feature === 'wood') s.tube([[-r * 0.35, baseY, 0], [0, baseY + r * 0.4, -r * 0.1], [r * 0.24, baseY + r * 0.53, -r * 0.18]], r * 0.04, s.material('#a39376'));
    else for (let i = 0; i < 6; i++) s.ball([r * 0.06, r * 0.014, r * 0.07], [Math.sin(i) * r * 0.12, baseY + r * 0.014, (i - 2.5) * r * 0.18], s.material('#c1bca4'), 8);
    if (a.lid) s.cylinder(r * (a.vessel === 'jar' ? 0.82 : 0.29), r * (a.vessel === 'jar' ? 0.84 : 0.3), r * 0.1, [0, h + r * 0.02, 0], s.material('#baa57e'), 24);
    if (a.condensation) for (let i = 0; i < 18; i++) { const t = Math.PI + context.random() * Math.PI, yy = baseY + context.random() * (h - baseY); s.ball([r * 0.012, r * 0.019, r * 0.012], [Math.cos(t) * r * 0.76, yy, Math.sin(t) * r * 0.76], rim, 8); }
    if (a.sprout) { s.rod([-r * 0.25, baseY, -r * 0.14], [-r * 0.21, h * 0.85, -r * 0.14], r * 0.012, green); s.ball([r * 0.12, r * 0.02, r * 0.04], [-r * 0.16, h * 0.83, -r * 0.14], green, 10); }
    return s.finish();
  },
});
