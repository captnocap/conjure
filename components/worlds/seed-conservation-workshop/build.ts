import * as THREE from 'three';
import { choice, defineWorld, diorama, noul, score } from '@conjure/kit';

export default defineWorld({
  questions: {
    building: choice('Where has the seed conservation workshop been made?', { school: 'A former village classroom with tall sash windows.', shed: 'A timber garden shed with exposed rafters.', laboratory: 'A pale tiled conservation laboratory with metal shelving.', barn: 'A converted brick barn with a broad arched back window.' }),
    work: choice('What work is underway in the room?', { cleaning: 'Seed cleaning, with suspended screens and straw waiting to be sorted.', swap: 'A neighbourhood seed exchange, with open boxes and a welcome board.', rescue: 'Rescuing a threatened seed collection, with tagged crates waiting to leave.', testing: 'Germination trials, with green seedlings on the light bench.' }),
    bench: choice('How are the workbenches arranged?', { long: 'A long bench below the windows and one side worktable.', islands: 'Two short work islands leave a broad central aisle.', horseshoe: 'Benches along the back and both sides surround the open floor.', workshop: 'One raised central demonstration table with surrounding shelves.' }),
    storage: choice('How is the seed collection stored?', { jars: 'Rows of amber and clear sealed jars.', packets: 'Paper packets in open stepped trays.', drawers: 'A wall of small shallow labelled drawers.', sacks: 'Cloth sacks and wooden sample boxes on shelves.' }),
    window: choice('What can be seen through the windows?', { garden: 'A kitchen garden with orderly raised beds.', rain: 'A grey wet afternoon behind pale streaked glass.', orchard: 'Warm fruit trees and a low green hill.', winter: 'Bare branches against a pale winter sky.' }),
    display: choice('What hangs above the work?', { botany: 'Three framed pressed botanical specimens.', calendar: 'A large sowing calendar ruled into months.', map: 'A field collection map with marked locations.', banners: 'A row of seed-saving paper pennants.' }),
    rack: score('How extensive are the drying racks?', ['One screen on a small wall bracket', 'A working rack with several screens', 'A full multi-level harvest drying tower']),
    sink: noul('Is there a deep potting sink in the side corner?'),
    stool: noul('Is an empty stool waiting at the workbench?'),
  },
  build(a, context) {
    const { mood, random } = context;
    const lab = a.building === 'laboratory', timber = a.building === 'shed';
    const slots: [number, number, number, number][] = [[0, 0.6, 0, 1], [-2.2, 0.6, 0, 1], [2.2, 1, 0, 1], [0, 2.5, 0, 1], [-2.1, -2.4, 0.93, 0.5], [1.5, -2.4, 0.93, 0.5]];
    const { art: s, world } = diorama(context, { background: '#e0e3d5', floor: lab ? '#9fae9e' : '#b5a487', width: 8.6, depth: 6.6, maxHeight: 2.1, radius: 0.85, pitch: 30, yaw: 24, scale: [0.65, 1.55], slots });
    const wall = s.material({ school: '#dfd6b8', shed: '#b5986d', laboratory: '#d8ded1', barn: '#b88e70' }[a.building]);
    const wood = s.material(lab ? '#9aa89e' : '#92744e'), pale = s.material('#e1dcc5'), green = s.material('#6f8664'), metal = s.material('#78877d', { metalness: 0.45 });
    // Back wall is built around openings, so its windows are actual bright apertures.
    s.box([8.6, 1.13, 0.15], [0, 0.565, -3.23], wall);
    s.box([8.6, 0.65, 0.15], [0, 3.475, -3.23], wall);
    for (const x of [-4.22, -1.5, 1.5, 4.22]) s.box([x === -1.5 || x === 1.5 ? 0.42 : 0.16, 2.02, 0.15], [x, 2.14, -3.23], wall);
    s.box([0.15, 3.8, 6.6], [-4.22, 1.9, 0], wall);
    // Window views are quiet, locally built reliefs behind clear glazing.
    const sky = s.material({ garden: '#bdccbd', rain: '#aebbbb', orchard: '#dfc8a0', winter: '#dce2db' }[a.window], { emissive: '#cbd3bd', emissiveIntensity: 0.12 });
    for (const x of [-2.86, 0, 2.86]) {
      s.box([2.3, 2.04, 0.05], [x, 2.14, -3.3], sky);
      for (const dx of [-1.15, 0, 1.15]) s.box([0.065, 2.08, 0.12], [x + dx, 2.14, -3.14], pale);
      for (const y of [1.11, 2.15, 3.18]) s.box([2.36, 0.065, 0.12], [x, y, -3.14], pale);
      if (a.building === 'barn') {
        const spandrel = new THREE.Shape();
        spandrel.moveTo(-1.15, 0.7); spandrel.lineTo(1.15, 0.7); spandrel.lineTo(1.15, 0);
        spandrel.absellipse(0, 0, 1.15, 0.68, 0, Math.PI, false); spandrel.closePath();
        s.mesh(new THREE.ExtrudeGeometry(spandrel, { depth: 0.12, bevelEnabled: false, curveSegments: 20 }), wall, [x, 2.48, -3.25]);
        s.tube(Array.from({ length: 17 }, (_, i) => [x + Math.cos(i / 16 * Math.PI) * 1.15, 2.48 + Math.sin(i / 16 * Math.PI) * 0.68, -3.105] as [number, number, number]), 0.04, wood);
      }
      s.box([2.5, 0.1, 0.28], [x, 1.11, -3.04], wood);
      if (a.window === 'garden') for (let i = 0; i < 4; i++) { s.box([1.9, 0.1, 0.05], [x, 1.25 + i * 0.13, -3.245], wood); for (let j = 0; j < 5; j++) s.ball([0.1, 0.07, 0.018], [x - 0.8 + j * 0.4, 1.33 + i * 0.13, -3.21], green, 8); }
      if (a.window === 'orchard' || a.window === 'winter') for (const dx of [-0.65, 0.6]) { s.rod([x + dx, 1.2, -3.22], [x + dx, 2.55, -3.22], 0.025, wood); for (const sign of [-1, 1]) s.rod([x + dx, 1.85, -3.22], [x + dx + sign * 0.27, 2.42, -3.22], 0.015, wood); if (a.window === 'orchard') s.ball([0.42, 0.42, 0.035], [x + dx, 2.42, -3.23], green, 10); }
      if (a.window === 'rain') for (let i = 0; i < 12; i++) s.rod([x - 1 + i * 0.17, 1.3 + random() * 1.4, -3.205], [x - 1.03 + i * 0.17, 1.6 + random() * 1.4, -3.205], 0.005, pale);
    }
    if (timber || a.building === 'barn') for (const z of [-3, -0.8, 1.4]) { s.rod([-4.1, 3.6, z], [0, 4.1, z], 0.07, wood); s.rod([0, 4.1, z], [4.1, 3.6, z], 0.07, wood); }
    if (timber) for (let x = -4; x < 4.2; x += 0.4) s.box([0.025, 1.1, 0.016], [x, 0.55, -3.14], wood);
    if (lab) for (let y = 0.3; y < 3.8; y += 0.3) s.box([0.008, 0.007, 6.3], [-4.135, y, 0], metal);
    const bench = (x: number, z: number, width: number, depth: number) => {
      const first = s.root.children.length;
      s.box([width, 0.09, depth], [x, 0.885, z], wood);
      for (const dx of [-width / 2 + 0.1, width / 2 - 0.1]) for (const dz of [-depth / 2 + 0.1, depth / 2 - 0.1]) s.box([0.075, 0.85, 0.075], [x + dx, 0.425, z + dz], wood);
      s.box([width - 0.15, 0.055, depth - 0.12], [x, 0.3, z], wood);
      const group = new THREE.Group();
      for (const mesh of s.root.children.slice(first)) group.add(mesh);
      s.root.add(group);
      return group;
    };
    if (a.bench === 'long' || a.bench === 'horseshoe') bench(0, -2.65, 7.5, 0.9);
    else for (const x of [-2.35, 2.35]) bench(x, -2.4, 2.5, 1.25);
    if (a.bench === 'islands') for (const x of [-2.5, 2.5]) bench(x, -0.6, 1.4, 1.6);
    if (a.bench === 'horseshoe') for (const x of [-3.65, 3.65]) bench(x, -0.4, 0.8, 3.5);
    const workSurfaces = slots.slice(0, 4).map(([x, z], i) => bench(x, z, i === 0 && a.bench === 'workshop' ? 1.8 : 1.45, 1.12));
    for (const surface of workSurfaces) surface.visible = false;
    const place = world.place;
    world.place = (items) => {
      workSurfaces.forEach((surface, i) => {
        const item = items[i];
        // Low, broad collections belong on a sorting surface; people and machines stand on the floor.
        const onBench = !!item && item.height < 0.85 && item.height / Math.max(0.01, item.radius * 2) < 1.15;
        surface.visible = onBench;
        slots[i][2] = onBench ? 0.93 : 0;
        slots[i][3] = onBench ? 0.75 : 1;
      });
      place(items);
    };
    // Side storage stays behind the cast and has distinct silhouettes for each collection.
    for (const y of [0.22, 0.78, 1.34, 1.9]) {
      s.box([0.62, 0.055, 2.1], [-3.8, y, 1.4], wood);
      for (let i = 0; i < 5; i++) {
        const z = 0.58 + i * 0.41;
        if (a.storage === 'jars') { s.cylinder(0.11, 0.11, 0.32, [-3.77, y + 0.18, z], s.material(i % 2 ? '#a38a58' : '#9cae8d'), 14); s.cylinder(0.115, 0.115, 0.04, [-3.77, y + 0.36, z], metal, 14); }
        if (a.storage === 'packets') for (let j = 0; j < 3; j++) s.box([0.16, 0.26, 0.02], [-3.71 + j * 0.03, y + 0.16, z], pale).rotation.z = 0.15;
        if (a.storage === 'drawers') { s.box([0.5, 0.42, 0.36], [-3.78, y + 0.23, z], wood); s.box([0.015, 0.035, 0.09], [-3.516, y + 0.24, z], metal); }
        if (a.storage === 'sacks') { s.lathe([[0.1, 0], [0.14, 0.08], [0.11, 0.3], [0.06, 0.38]], pale, [-3.78, y + 0.028, z]); s.ring(0.05, 0.009, [-3.78, y + 0.38, z], wood).rotation.x = Math.PI / 2; }
      }
    }
    for (const z of [0.3, 2.5]) s.box([0.06, 2.25, 0.06], [-3.8, 1.125, z], wood);
    const racks = 1 + Math.round(a.rack * 5);
    for (let i = 0; i < racks; i++) {
      const y = 0.35 + i * 0.28;
      s.box([0.9, 0.035, 0.65], [3.45, y, 2.1], pale);
      for (const dx of [-0.45, 0.45]) s.box([0.035, 0.06, 0.7], [3.45 + dx, y + 0.02, 2.1], wood);
      for (let j = 0; j < 8; j++) s.box([0.85, 0.007, 0.008], [3.45, y + 0.03, 1.8 + j * 0.085], metal);
    }
    for (const x of [3, 3.9]) for (const z of [1.76, 2.44]) s.box([0.04, 0.4 + racks * 0.28, 0.04], [x, (0.4 + racks * 0.28) / 2, z], wood);
    const sign = { cleaning: 'CLEAN / SORT / SAVE', swap: 'NEIGHBOURHOOD SEED SWAP', rescue: 'RESCUE COLLECTION', testing: 'GERMINATION TRIALS' }[a.work];
    s.label(sign, 3.6, 0.25, [0, 3.52, -3.13]);
    if (a.display === 'botany') for (let i = 0; i < 3; i++) { s.box([0.035, 0.7, 0.48], [-4.12, 2.7, -1.8 + i * 0.8], wood); const label = s.label('HERBARIUM', 0.42, 0.62, [-4.095, 2.7, -1.8 + i * 0.8]); label.rotation.y = Math.PI / 2; s.rod([-4.07, 2.48, -1.8 + i * 0.8], [-4.07, 2.93, -1.8 + i * 0.8], 0.008, green); }
    if (a.display === 'calendar' || a.display === 'map') { const chart = s.label(a.display === 'map' ? 'COLLECTION SITES' : 'SOWING CALENDAR', 1.5, 0.8, [-4.09, 2.65, -1.25]); chart.rotation.y = Math.PI / 2; for (let i = 0; i < 6; i++) s.rod([-4.065, 2.3, -1.9 + i * 0.23], [-4.065, 2.86, -1.9 + i * 0.23], 0.005, green); }
    if (a.display === 'banners') for (let i = 0; i < 9; i++) s.mesh(new THREE.ConeGeometry(0.16, 0.32, 3), i % 2 ? pale : green, [-3.6 + i * 0.9, 3.18 + Math.abs(i - 4) * 0.05, -2.8]).rotation.z = Math.PI;
    if (a.work === 'testing') for (let i = 0; i < 8; i++) { s.cylinder(0.11, 0.085, 0.15, [-1.5 + i * 0.42, 1.02, -2.65], wood, 12); s.rod([-1.5 + i * 0.42, 1.1, -2.65], [-1.5 + i * 0.42, 1.33, -2.65], 0.008, green); s.ball([0.09, 0.02, 0.035], [-1.5 + i * 0.42, 1.3, -2.65], green, 8); }
    if (a.work === 'rescue' || a.work === 'swap') for (const x of [-1.2, 1.2]) { s.box([0.7, 0.32, 0.5], [x, 0.16, -1.75], wood); s.label(a.work === 'rescue' ? 'FRAGILE / SEEDS' : 'DONATIONS', 0.6, 0.12, [x, 0.23, -1.495]); }
    if (a.work === 'cleaning') for (let i = 0; i < 18; i++) s.rod([2.4 + random() * 0.25, 0.15, -2], [2.35 + random() * 0.45, 0.6 + random() * 0.3, -1.9], 0.008, pale);
    if (a.sink) { s.box([0.7, 0.23, 0.65], [-3.65, 0.9, -1.5], pale); s.box([0.56, 0.02, 0.5], [-3.65, 1.022, -1.5], metal); s.tube([[-3.8, 1, -1.73], [-3.8, 1.35, -1.73], [-3.65, 1.4, -1.73], [-3.6, 1.25, -1.73]], 0.018, metal); }
    if (a.stool) { s.cylinder(0.23, 0.23, 0.065, [1.6, 0.58, -1.5], wood); for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; s.rod([1.6 + Math.sin(t) * 0.25, 0, -1.5 + Math.cos(t) * 0.25], [1.6 + Math.sin(t) * 0.17, 0.56, -1.5 + Math.cos(t) * 0.17], 0.025, wood); } }
    if (mood.wear > 0.4) for (let i = 0; i < 10; i++) s.box([0.3 + random() * 0.4, 0.002, 0.015], [(random() - 0.5) * 7, 0.003, (random() - 0.5) * 5], wood).rotation.y = random() * Math.PI;
    return world;
  },
});
