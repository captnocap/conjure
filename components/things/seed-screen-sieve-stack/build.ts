import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    arrangement: choice('How are the cleaning screens arranged?', {
      nested: 'Nested into one tall cylindrical stack ready for storage.',
      staggered: 'Three screens staggered sideways so each mesh can be seen.',
      working: 'One wide screen lies flat with a smaller screen leaning behind it.',
      separated: 'Three screens spread out across the sorting table.',
    }),
    rim: choice('What are the rims made from?', { bentwood: 'Warm bentwood rims joined with dark rivets.', brass: 'Rolled brass rims with soldered seams.', steel: 'Commercial stainless steel rims.', enamel: 'Cream enamel rims with a dark green lip.' }),
    crop: choice('What is being screened?', { beans: 'Large kidney beans in burgundy and cream.', grain: 'Golden elongated wheat and barley kernels.', flowers: 'Tiny dark flower seeds with wisps of pale chaff.', squash: 'Broad pale squash seeds shaped like teardrops.' }),
    grade: choice('What is the finest screen like?', { coarse: 'A widely spaced open square grid.', medium: 'An even square wire mesh.', fine: 'A tightly woven seed mesh.', torn: 'A damaged mesh with an obvious gap awaiting repair.' }),
    load: score('How much seed remains in the screens?', ['A few test seeds', 'One modest handful', 'A broad layer ready for sifting']),
    story: choice('What has just happened?', { sorted: 'Seeds have been separated neatly into grades.', spilled: 'A screen tipped, leaving a little spill beside it.', tagged: 'A rare batch has been tagged and set aside.', abandoned: 'A brush was left across the top screen mid-task.' }),
    handles: noul('Do the screens have loop handles for shaking?'),
    brush: noul('Is a short stiff cleaning brush beside the screens?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const rim = s.material({ bentwood: '#b48b56', brass: '#b39c59', steel: '#a9b5b5', enamel: '#e6dec9' }[a.rim], { metalness: a.rim === 'brass' || a.rim === 'steel' ? 0.7 : 0.05 });
    const wire = s.material('#686d5c', { metalness: 0.55 });
    const seed = s.material({ beans: '#774739', grain: '#ccab57', flowers: '#3f372d', squash: '#e1ce96' }[a.crop]);
    const origins: [number, number, number][] = a.arrangement === 'nested' ? [[0, 0, 0], [0, 0.11, 0], [0, 0.22, 0]] : a.arrangement === 'staggered' ? [[-0.12, 0, 0.04], [0.05, 0.11, 0], [0.2, 0.22, -0.07]] : a.arrangement === 'separated' ? [[-0.35, 0, 0.13], [0.25, 0, 0.16], [0, 0, -0.35]] : [[0, 0, 0.12], [0, 0.15, -0.25]];
    origins.forEach(([cx, cy, cz], n) => {
      const firstMesh = s.root.children.length;
      const r = 0.29 - n * 0.025, h = 0.11;
      s.lathe([[r - 0.012, 0], [r, 0], [r, h], [r - 0.012, h], [r - 0.012, 0]], rim, [cx, cy, cz]);
      for (const y of [cy + 0.01, cy + h - 0.01]) s.ring(r - 0.004, 0.006, [cx, y, cz], rim).rotation.x = Math.PI / 2;
      const spacing = { coarse: 0.055, medium: 0.035, fine: 0.022, torn: 0.035 }[a.grade];
      for (let d = -r + spacing; d < r - spacing / 2; d += spacing) {
        const reach = Math.sqrt(r * r - d * d) - 0.012;
        if (a.grade !== 'torn' || d < -0.05 || d > 0.08) s.rod([cx - reach, cy + 0.018, cz + d], [cx + reach, cy + 0.018, cz + d], 0.0018, wire);
        s.rod([cx + d, cy + 0.019, cz - reach], [cx + d, cy + 0.019, cz + reach], 0.0018, wire);
      }
      const count = a.arrangement === 'working' && n === 1 ? 0 : Math.round(4 + a.load * 32 + mood.density * 5);
      const size = { beans: [0.014, 0.008, 0.022], grain: [0.005, 0.004, 0.013], flowers: [0.004, 0.003, 0.005], squash: [0.013, 0.003, 0.023] }[a.crop] as [number, number, number];
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * (r - 0.05);
        s.ball(size, [cx + Math.cos(angle) * radius, cy + 0.026, cz + Math.sin(angle) * radius], seed, 8).rotation.y = random() * Math.PI;
      }
      if (a.handles) for (const sign of [-1, 1]) s.ring(0.052, 0.008, [cx + sign * (r + 0.035), cy + 0.075, cz], rim).rotation.y = Math.PI / 2;
      if (a.story === 'tagged') s.label('SAVE / 027', 0.15, 0.044, [cx, cy + 0.065, cz + r + 0.002]);
      if (a.arrangement === 'working' && n === 1) {
        const screen = new THREE.Group();
        for (const mesh of s.root.children.slice(firstMesh)) { mesh.position.sub(new THREE.Vector3(cx, cy, cz)); screen.add(mesh); }
        screen.rotation.x = 0.95;
        screen.position.set(cx, r * Math.sin(0.95) + 0.006, cz);
        s.root.add(screen);
      }
      if (a.arrangement === 'staggered' && n > 0) for (const side of [-1, 1]) s.box([0.025, cy, 0.025], [cx + side * r * 0.8, cy / 2, cz - r * 0.4], rim);
    });
    if (a.story === 'spilled') for (let i = 0; i < 12; i++) s.ball([0.008, 0.004, 0.014], [(random() - 0.5) * 0.4, 0.006, 0.44 + random() * 0.12], seed, 8);
    if (a.brush || a.story === 'abandoned') {
      const rest = a.arrangement === 'working' ? origins[0] : origins.at(-1)!;
      const y = a.story === 'abandoned' ? rest[1] + 0.13 : 0.03, z = a.story === 'abandoned' ? rest[2] : 0.48;
      s.box([0.3, 0.035, 0.055], [0, y, z], s.material('#8a6746'));
      for (let i = 0; i < 13; i++) s.box([0.012, 0.035, 0.047], [-0.13 + i * 0.021, y - 0.032, z], s.material('#c3b68c'));
    }
    return s.finish();
  },
});
