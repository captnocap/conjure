import * as THREE from 'three';
import { choice, defineWorld, diorama, noul, score } from '@conjure/kit';

export default defineWorld({
  questions: {
    building: choice('What kind of conservatory houses the fossil workshop?', { victorian: 'An old iron and glass pavilion with pointed roof ribs.', university: 'A pale tiled university preparation room with broad clerestory windows.', field: 'A timber field station with clear corrugated roof panels.', museum: 'A neat museum conservation gallery behind a glazed partition.' }),
    benches: choice('How are the preparation benches arranged?', { island: 'One broad central work island.', paired: 'Two separated work tables with an open aisle.', horseshoe: 'A U shaped bench surrounds a small work court.', long: 'One long shallow sorting bench runs across the room.' }),
    surface: choice('What covers the working surfaces?', { cork: 'Cork lined preparation tops.', slate: 'Dark slate worktops with pale edge strips.', enamel: 'White enamel tops and green edges.', timber: 'Thick worn timber planks.' }),
    storage: choice('Where are the labelled specimens kept?', { drawers: 'A tall bank of shallow wooden drawers.', pigeonholes: 'Open square sample cubbies.', jars: 'A few glass sample jars on open shelves.', crates: 'Stacked marked field crates awaiting unpacking.' }),
    roof: choice('How does the roof filter the daylight?', { clear: 'Clear panes between narrow ribs.', blinds: 'Partly drawn cream fabric roof blinds.', frosted: 'Frosted pale green glass diffuses the light.', open: 'Vent panels tilt open above the benches.' }),
    excavation: choice('What story does the workshop tell?', { arrival: 'Strapped field boxes have just arrived.', active: 'A preparation session is underway with chips and notes.', mapping: 'A wall map and colour pinned specimen positions record the work.', teaching: 'A row of small stools and a specimen diagram await a class.' }),
    extraction: choice('How is preparation dust removed?', { arms: 'Two flexible extractor arms hang over the work.', hood: 'A broad rear extraction hood with a dark mouth.', trunk: 'One metal duct runs along the wall to a floor collector.', windows: 'No machinery, only open side windows.' }),
    wash: noul('Is there a deep wash sink and drying rack in the corner?'),
    vegetation: score('How much planting survives around the glass room?', ['One modest fern at the window', 'A few pots along the sill', 'Tall ferns press against the glass']),
    notice: choice('What identifies the room?', { preparation: 'FOSSIL PREPARATION in plain black letters.', collections: 'NATURAL HISTORY COLLECTIONS.', working: 'WORK IN PROGRESS on a small red sign.', unnamed: 'An unlabelled private working room.' }),
  },
  build(a, context) {
    const spots: [number, number][] = a.benches === 'paired' ? [[1.5, 0.55], [-1.5, 0.55], [-1.5, -0.35], [1.5, -0.35], [-1.5, -1.15], [1.5, -1.15]] : a.benches === 'horseshoe' ? [[0, -1.15], [-1.5, 0.55], [1.5, 0.55], [-1.5, -1.15], [1.5, -1.15]] : a.benches === 'long' ? [[0, 0.55], [-1.6, 0.55], [1.6, 0.55]] : [[0, 0.55], [-1.5, 0.55], [1.5, 0.55], [-1.5, -1.15], [1.5, -1.15], [0, -1.15]];
    const slots = spots.map(([x, z], i) => [x, z, 1.03, i === 0 ? 1.2 : 0.8] as const);
    const { art: s, world } = diorama(context, { width: 6.2, depth: 4.8, background: '#deded1', floor: '#b9b5a0', yaw: 24, pitch: 34, maxHeight: 0.62, radius: 0.52, slots, viewBox: [[-3.1, 0, -2.4], [3.1, 3.1, 2.4]] });
    const iron = s.material(a.building === 'field' ? '#80684b' : a.building === 'victorian' ? '#405f54' : '#a5aaa0', { metalness: a.building === 'field' ? 0 : 0.4 });
    const wall = s.material('#d5ceb6'), wood = s.material('#987b54'), dark = s.material('#4a554c');
    const top = s.material({ cork: '#ae9568', slate: '#59635d', enamel: '#dce0cc', timber: '#947343' }[a.surface]);
    const glass = s.material(a.roof === 'frosted' ? '#b8cfc2' : '#cbd9cf', { transparent: true, opacity: a.roof === 'frosted' ? 0.28 : 0.12, depthWrite: false });
    s.box([6.2, 0.85, 0.15], [0, 0.425, -2.3], wall);
    s.box([0.15, 0.85, 4.6], [-3, 0.425, 0], wall);
    for (let i = 0; i < 6; i++) { const x = -3 + i * 1.2; s.rod([x, 0.85, -2.3], [x, 3.05, -2.3], 0.035, iron); if (i < 5) { s.box([1.12, 2.12, 0.025], [x + 0.6, 1.93, -2.3], glass); s.rod([x, 1.85, -2.3], [x + 1.2, 1.85, -2.3], 0.025, iron); } }
    for (const z of [-2.3, -0.8, 0.8, 2.3]) { s.rod([-3, 0.85, z], [-3, 3.05, z], 0.032, iron); s.rod([-3, 3.05, z], [0, a.building === 'victorian' ? 4 : 3.5, z], 0.032, iron); s.rod([0, a.building === 'victorian' ? 4 : 3.5, z], [3, 3.05, z], 0.032, iron); }
    for (const z of [-2.3, 2.3]) s.rod([3, 0, z], [3, 3.05, z], 0.032, iron);
    s.rod([0, a.building === 'victorian' ? 4 : 3.5, -2.3], [0, a.building === 'victorian' ? 4 : 3.5, 2.3], 0.025, iron);
    s.rod([3, 3.05, -2.3], [3, 3.05, 2.3], 0.025, iron);
    // Roof remains a sparse canopy so the cast is readable through the glazing.
    if (a.roof === 'blinds') for (let i = 0; i < 4; i++) s.box([1, 0.025, 1.5], [-2.3 + i * 1.5, 3.35, -1.3], s.material('#ded4b5'));
    else if (a.roof === 'open') for (let i = 0; i < 4; i++) { const pane = s.box([1.1, 0.025, 0.8], [-2.2 + i * 1.5, 3.4, -1.85], glass); pane.rotation.x = 0.5; }
    else for (const x of [-1.5, 1.5]) { const pane = s.box([3.05, 0.02, 1.4], [x, 3.38, -1.55], glass); pane.rotation.z = x < 0 ? 0.15 : -0.15; }
    const table = (x: number, z: number, w: number, d: number) => { s.box([w, 0.09, d], [x, 0.985, z], top); for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const dz of [-d / 2 + 0.1, d / 2 - 0.1]) s.box([0.07, 0.94, 0.07], [x + dx, 0.47, z + dz], iron); s.box([w, 0.04, 0.04], [x, 0.9, z + d / 2], wood); };
    // Each arrangement supplies only standing pads on its own work surfaces.
    if (a.benches === 'island') table(0, -0.25, 4.6, 2.8);
    if (a.benches === 'paired') { table(-1.5, -0.25, 1.55, 2.8); table(1.5, -0.25, 1.55, 2.8); }
    if (a.benches === 'horseshoe') { table(-1.5, -0.25, 1.55, 2.8); table(1.5, -0.25, 1.55, 2.8); table(0, -1.15, 1.5, 0.95); }
    if (a.benches === 'long') table(0, 0.55, 4.6, 0.95);
    const sx = -2.72, sz = -1.62;
    if (a.storage === 'drawers') { s.box([0.45, 1.7, 0.9], [sx, 0.85, sz], wood); for (let j = 0; j < 9; j++) { s.box([0.025, 0.014, 0.75], [sx + 0.24, 0.15 + j * 0.17, sz], dark); s.box([0.028, 0.035, 0.12], [sx + 0.26, 0.22 + j * 0.17, sz], iron); } }
    if (a.storage === 'pigeonholes' || a.storage === 'jars') {
      for (let j = 0; j < 4; j++) { s.box([0.5, 0.035, 1.3], [sx, 0.5 + j * 0.43, sz + 0.15], wood); for (let k = 0; k < 4; k++) { const z = sz - 0.32 + k * 0.29; if (a.storage === 'jars') { s.cylinder(0.073, 0.07, 0.2, [sx, 0.62 + j * 0.43, z], glass); s.cylinder(0.074, 0.074, 0.025, [sx, 0.73 + j * 0.43, z], wood); } else s.box([0.45, 0.4, 0.02], [sx, 0.71 + j * 0.43, z], wood); } }
    }
    if (a.storage === 'crates') for (let j = 0; j < 3; j++) { s.box([0.55, 0.42, 0.7], [sx + (j % 2) * 0.08, 0.21 + j * 0.42, sz], wood); for (const z of [-0.23, 0.23]) s.box([0.57, 0.035, 0.07], [sx + (j % 2) * 0.08, 0.15 + j * 0.42, sz + z], dark); }
    if (a.extraction === 'arms') for (const x of [-1.3, 1.3]) { s.tube([[x, 2.8, -2.25], [x, 2.6, -1.4], [x + 0.2, 1.9, -0.5]], 0.075, dark); s.cylinder(0.08, 0.2, 0.24, [x + 0.2, 1.8, -0.5], iron); }
    if (a.extraction === 'hood') { s.box([2.5, 0.5, 0.5], [0, 2.05, -2], iron); s.box([2.3, 0.3, 0.025], [0, 2.02, -1.73], dark); }
    if (a.extraction === 'trunk') { s.tube([[2.7, 0.5, -2.15], [2.7, 2.75, -2.15], [-2.5, 2.75, -2.15]], 0.1, iron); s.cylinder(0.24, 0.24, 0.8, [2.7, 0.4, -2.15], dark); }
    if (a.wash) { s.box([0.75, 0.85, 0.6], [2.65, 0.425, 1.75], wall); s.box([0.67, 0.025, 0.52], [2.65, 0.87, 1.75], dark); for (const x of [2.32, 2.98]) s.box([0.055, 0.12, 0.56], [x, 0.9, 1.75], iron); for (const z of [1.5, 2]) s.box([0.7, 0.12, 0.055], [2.65, 0.9, z], iron); s.tube([[2.65, 0.93, 1.48], [2.65, 1.22, 1.48], [2.65, 1.22, 1.7], [2.65, 1.12, 1.7]], 0.02, iron); }
    if (a.excavation === 'arrival') { s.box([0.8, 0.55, 0.65], [-2, 0.275, 1.8], wood); for (const x of [-2.25, -1.75]) s.box([0.06, 0.58, 0.67], [x, 0.3, 1.8], dark); }
    if (a.excavation === 'active') for (let j = 0; j < 14; j++) s.ball([0.035, 0.016, 0.028], [(context.random() - 0.5) * 1.4, 1.05, -0.3 + context.random() * 0.5], wall, 8);
    if (a.excavation === 'mapping') { s.box([1.4, 0.9, 0.035], [0, 1.7, -2.18], s.material('#d7c998')); for (let j = 0; j < 5; j++) { s.rod([-0.65, 1.35 + j * 0.17, -2.15], [0.65, 1.35 + j * 0.17, -2.15], 0.004, wood); s.rod([-0.6 + j * 0.3, 1.3, -2.15], [-0.6 + j * 0.3, 2.1, -2.15], 0.004, wood); } }
    if (a.excavation === 'teaching') for (const x of [-1.7, 0, 1.7]) { s.cylinder(0.22, 0.22, 0.06, [x, 0.58, 1.7], wood); for (const dx of [-0.13, 0.13]) for (const dz of [-0.13, 0.13]) s.rod([x + dx, 0.03, 1.7 + dz], [x + dx * 0.7, 0.55, 1.7 + dz * 0.7], 0.016, iron); }
    const pots = 1 + Math.round(a.vegetation * 4);
    const leaf = s.material('#5b7450', { side: THREE.DoubleSide });
    for (let j = 0; j < pots; j++) {
      const x = -2.3 + j * 1.1, z = -2.04;
      s.cylinder(0.12, 0.08, 0.2, [x, 0.96, z], s.material('#a76c45'));
      for (let k = 0; k < 5; k++) {
        const t = k / 5 * Math.PI * 2, h = 0.35 + a.vegetation * 0.4;
        s.surface((u, v, p) => {
          const reach = v * 0.3, breadth = (u - 0.5) * 0.12 * Math.sin(v * Math.PI) * (0.3 + 0.7 * Math.abs(Math.sin(v * 7 * Math.PI)));
          p.set(x + Math.cos(t) * reach - Math.sin(t) * breadth, 1.04 + h * (Math.sin(v * 2.3) * 0.72 + v * 0.12), z + Math.sin(t) * reach + Math.cos(t) * breadth);
        }, leaf, { segments: [2, 28] });
      }
    }
    if (a.notice !== 'unnamed') s.label({ preparation: 'FOSSIL PREPARATION', collections: 'NATURAL HISTORY', working: 'WORK IN PROGRESS' }[a.notice], 2.2, 0.28, [0, 2.75, -2.24], a.notice === 'working' ? '#9c4432' : '#334d41', '#d8d4bc');
    return world;
  },
});
