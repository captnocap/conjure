import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    species: choice('What plants fill the garden?', { rosettes: 'Layered echeveria rosettes.', aloe: 'Tall pointed aloe leaves.', jade: 'Small branching jade plants.', mixed: 'A mix of rosettes, aloes and jade.' }),
    size: score('How broad is the planter?', ['A tiny desk garden', 'A small planted bowl', 'A broad garden tray']),
    vessel: choice('What vessel holds the plants?', { oval: 'An oval grey ceramic bowl.', trough: 'A rectangular terracotta trough.', rock: 'A rough hollow stone.' }),
    pigment: choice('What shades cover the leaves?', { sage: 'Pale sage and silver.', lilac: 'Lilac grey with pink tips.', green: 'Rich green and olive.', blue: 'Powdery blue-green.' }),
    arrangement: choice('How are the plants arranged?', { hero: 'One large rosette with a few smaller companions.', rows: 'Three ordered plant clusters.', wild: 'An uneven miniature wilderness.' }),
    gravel: noul('Does pale gravel cover the exposed soil?'),
    flower: noul('Does a tall flower stalk rise from one rosette?'),
    driftwood: noul('Is a small sculptural branch placed among the plants?'),
  },
  build(a, context) {
    const s = new Sculpture(context), width = 0.12 + a.size * 0.65, u = width / 2, green = s.material({ sage: '#a1b694', lilac: '#b4a6b2', green: '#71956c', blue: '#93b6b4' }[a.pigment]), soil = s.material('#8d8067'), vessel = s.material(a.vessel === 'trough' ? '#b39378' : '#b7b8a3'), y = u * 0.25;
    if (a.vessel === 'trough') { s.box([width, u * 0.27, width * 0.63], [0, u * 0.14, 0], vessel); s.box([width * 0.9, u * 0.025, width * 0.53], [0, y, 0], soil); }
    else { const bowl = s.lathe([[u * 0.7, 0], [u * 0.89, u * 0.06], [u, u * 0.27], [u * 0.91, u * 0.3], [u * 0.8, u * 0.22], [0, u * 0.22]], vessel); bowl.scale.z = 0.7; const bed = s.cylinder(u * 0.88, u * 0.88, u * 0.02, [0, y, 0], soil); bed.scale.z = 0.7; }
    for (let plant = 0; plant < 4; plant++) {
      const t = plant * 2.4, x = a.arrangement === 'rows' ? (plant - 1.5) * u * 0.42 : plant === 0 ? -u * 0.2 : Math.cos(t) * u * (a.arrangement === 'wild' ? 0.43 + context.random() * 0.17 : 0.56), z = a.arrangement === 'rows' ? (plant % 2 ? -1 : 1) * u * 0.13 : plant === 0 ? 0 : Math.sin(t) * u * 0.4, radius = u * (plant === 0 && a.arrangement === 'hero' ? 0.48 : a.arrangement === 'wild' ? 0.22 + context.random() * 0.13 : 0.3), type = a.species === 'mixed' ? ['rosettes', 'aloe', 'jade', 'rosettes'][plant] : a.species;
      if (type === 'jade') { const bark = s.material('#9a9274'); s.rod([x, y, z], [x, y + radius * 1.3, z], radius * 0.06, bark); for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { const h = y + radius * (0.3 + i * 0.19), reach = radius * (0.6 - i * 0.06); s.rod([x, h, z], [x + side * reach * 0.5, h + radius * 0.08, z], radius * 0.025, bark); s.ball([reach * 0.5, radius * 0.04, radius * 0.14], [x + side * reach * 0.7, h + radius * 0.12, z], green, 12); } }
      else for (let layer = 0; layer < (type === 'aloe' ? 1 : 3); layer++) for (let i = 0; i < 9; i++) {
        const angle = i * Math.PI * 2 / 9 + layer * 0.36, len = radius * (1 - layer * 0.2), rise = type === 'aloe' ? len * (0.9 + context.random() * 0.8) : len * (0.2 + layer * 0.3), end = new THREE.Vector3(x + Math.cos(angle) * len, y + rise, z + Math.sin(angle) * len), start = new THREE.Vector3(x, y + layer * radius * 0.1, z), direction = end.clone().sub(start), leaf = type === 'aloe' ? s.cylinder(0, radius * 0.09, direction.length(), start.clone().add(end).multiplyScalar(0.5).toArray() as [number, number, number], green, 4) : s.ball([direction.length() * 0.55, radius * 0.045, radius * 0.17], start.clone().lerp(end, 0.5).toArray() as [number, number, number], green, 12); leaf.quaternion.setFromUnitVectors(type === 'aloe' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), direction.normalize());
      }
    }
    if (a.vessel === 'rock') for (let i = 0; i < 11; i++) { const t = i * Math.PI * 2 / 11; const facet = s.ball([u * 0.21, u * 0.14, u * 0.16], [Math.cos(t) * u * 0.89, u * 0.18, Math.sin(t) * u * 0.62], vessel, 6); facet.rotation.y = t; }
    if (a.gravel) { const pebbles: { at: [number, number, number]; size: number }[] = []; for (let i = 0; i < 60; i++) { const t = i * 2.4, rr = Math.sqrt(context.random()) * u * 0.86; pebbles.push({ at: [Math.cos(t) * rr, y + u * 0.013, Math.sin(t) * rr * 0.65], size: u * (0.018 + context.random() * 0.012) }); } s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#d8ccb0'), pebbles); }
    if (a.flower) { const x = -u * 0.2, flower = s.material('#d3b482'); s.tube([[x, y, 0], [x + u * 0.12, y + u * 0.7, 0], [x + u * 0.3, y + u, 0]], u * 0.016, green); for (let i = 0; i < 6; i++) s.ball([u * 0.06, u * 0.045, u * 0.05], [x + u * (0.2 + i * 0.04), y + u * (0.7 + i * 0.05), 0], flower, 8); }
    if (a.driftwood) s.tube([[-u * 0.75, y, u * 0.25], [-u * 0.2, y + u * 0.07, u * 0.2], [u * 0.3, y + u * 0.05, u * 0.33]], u * 0.035, s.material('#ac9c7d'));
    return s.finish();
  },
});
