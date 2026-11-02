import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    arrangement: choice('How is the preparation tool arranged?', { resting: 'The pen rests diagonally across its work mat.', docked: 'The pen sits in a raised metal cradle.', paired: 'Two pens with different points lie together.', rolled: 'The pen lies in an opened cloth tool roll.' }),
    handle: choice('What is the handpiece made of?', { steel: 'A narrow brushed steel cylinder.', red: 'A red rubber grip on stainless steel.', wood: 'A warm turned wooden grip.', black: 'A black knurled polymer grip.' }),
    tip: choice('Which preparation point is fitted?', { needle: 'A long needle point for minute cracks.', chisel: 'A short flat chisel for removing broad flakes.', round: 'A rounded point for controlled surface work.', fork: 'A tiny two prong tip beside a delicate ridge.' }),
    hose: score('How much air hose is coiled beside the pen?', ['One loose loop', 'Three regular loops', 'A long coiled air line']),
    pedal: noul('Is the sloping foot pedal connected to the air line?'),
    specimen: choice('What has the preparator just been working on?', { shell: 'A curved shell ridge emerging from pale stone.', bone: 'A dark fossil bone exposed in brown matrix.', chip: 'A plain test chip with parallel tool marks.', empty: 'Only the clean mat and handpiece remain.' }),
    progress: score('If a specimen remains on the mat, how far has it been prepared?', ['A narrow scraped window', 'Half the surrounding matrix removed', 'The fossil exposed with chips beside it']),
    accessories: choice('Which accessory lies within reach?', { brush: 'A soft cleaning brush.', bottle: 'A small consolidant bottle with a fine nozzle.', goggles: 'Clear protective goggles.', points: 'A row of spare steel nibs.' }),
    gauge: noul('Is a small pressure regulator and round gauge connected?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const steel = s.material('#adb4ad', { metalness: 0.78, roughness: 0.27 }), rubber = s.material('#303b36'), cloth = s.material('#788572'), bone = s.material('#775437');
    s.box([0.48, 0.008, 0.32], [0, 0.004, 0], cloth);
    if (a.arrangement === 'rolled') { s.cylinder(0.026, 0.026, 0.31, [-0.23, 0.029, 0], s.material('#bfae83')).rotation.x = Math.PI / 2; for (let j = 0; j < 4; j++) s.box([0.05, 0.004, 0.13], [-0.18 + j * 0.06, 0.012, -0.08], s.material('#a79872')); }
    const hand = s.material({ steel: '#a5ada7', red: '#a94731', wood: '#a57d43', black: '#333d37' }[a.handle], { metalness: a.handle === 'steel' ? 0.7 : 0.08 });
    const count = a.arrangement === 'paired' ? 2 : 1;
    for (let p = 0; p < count; p++) {
      const z = 0.055 + p * 0.05, y = a.arrangement === 'docked' ? 0.06 : 0.025;
      s.rod([-0.14, y, z - 0.035], [0.015, y, z + 0.025], 0.011, hand, 0.008);
      s.rod([0.015, y, z + 0.025], [0.055, y, z + 0.04], 0.008, steel, 0.002);
      if (a.tip === 'chisel') { const chisel = s.box([0.025, 0.003, 0.008], [0.065, y, z + 0.044], steel); chisel.rotation.y = -0.36; }
      else if (a.tip === 'fork') for (const side of [-1, 1]) s.rod([0.05, y, z + 0.04 + side * 0.003], [0.085, y, z + 0.053 + side * 0.003], 0.001, steel);
      else s.rod([0.05, y, z + 0.04], [a.tip === 'needle' ? 0.1 : 0.08, y, z + 0.058], 0.0017, steel, a.tip === 'needle' ? 0.0003 : 0.0012);
      if (a.handle === 'black' || a.handle === 'steel') for (let k = 0; k < 7; k++) { const x = -0.11 + k * 0.013; const ring = s.ring(0.0115, 0.0011, [x, y, z - 0.035 + (x + 0.14) * 0.387], rubber); ring.rotation.y = Math.PI / 2; ring.rotation.x = 0.37; }
      if (a.arrangement === 'docked') for (const x of [-0.11, 0.0]) { s.rod([x, 0.01, z + (x + 0.05) * 0.3], [x, y - 0.012, z + (x + 0.05) * 0.3], 0.007, steel); s.box([0.04, 0.006, 0.04], [x, 0.012, z + (x + 0.05) * 0.3], steel); }
    }
    const loops = 1 + Math.round(a.hose * 5), path: [number, number, number][] = [[-0.14, 0.025, 0.02], [-0.21, 0.015, -0.03]];
    for (let j = 0; j <= loops * 24; j++) { const t = j / 24 * Math.PI * 2; path.push([-0.07 + Math.cos(t) * 0.067, 0.015 + j / (loops * 24) * 0.025, -0.073 + Math.sin(t) * 0.045]); }
    path.push([0.1, 0.012, -0.12]); s.tube(path, 0.0038, rubber);
    if (a.pedal) { const pedal = s.box([0.095, 0.022, 0.13], [0.25, 0.025, -0.015], rubber); pedal.rotation.x = -0.15; for (let k = 0; k < 5; k++) s.box([0.078, 0.003, 0.003], [0.25, 0.04 - k * 0.002, -0.05 + k * 0.019], steel); s.tube([[0.1, 0.012, -0.12], [0.25, 0.01, -0.12], [0.25, 0.025, -0.07]], 0.003, rubber); }
    if (a.specimen !== 'empty') {
      const rock = s.mesh(new THREE.DodecahedronGeometry(0.06), s.material('#b8a789'), [0.12, 0.04, 0.045]); rock.scale.set(1.15, 0.5, 0.9);
      if (a.specimen === 'shell') s.tube([[0.08, 0.065, 0.045], [0.1, 0.077, 0.025], [0.125, 0.078, 0.03], [0.14, 0.068, 0.05]], 0.004 + a.progress * 0.005, bone);
      if (a.specimen === 'bone') { s.rod([0.09, 0.072, 0.035], [0.145, 0.073, 0.055], 0.008 + a.progress * 0.005, bone); for (const x of [0.09, 0.145]) s.ball([0.016, 0.009, 0.014], [x, 0.072, x === 0.09 ? 0.035 : 0.055], bone, 12); }
      if (a.specimen === 'chip') for (let k = 0; k < 3 + Math.round(a.progress * 6); k++) s.rod([0.085 + k * 0.008, 0.071, 0.035], [0.09 + k * 0.008, 0.071, 0.065], 0.0013, bone);
      for (let k = 0; k < 3 + a.progress * 12 + context.mood.density * 6; k++) s.ball([0.004, 0.003, 0.005], [0.075 + rnd() * 0.13, 0.013, 0.09 + rnd() * 0.055], s.material('#b8a789'), 6);
    }
    if (a.accessories === 'brush') { s.rod([-0.15, 0.018, 0.135], [-0.02, 0.018, 0.145], 0.004, hand); s.rod([-0.02, 0.018, 0.145], [0.015, 0.018, 0.148], 0.008, bone, 0.001); }
    if (a.accessories === 'bottle') { s.cylinder(0.018, 0.018, 0.055, [0.17, 0.039, -0.1], s.material('#c7b474')); s.cylinder(0.006, 0.01, 0.025, [0.17, 0.079, -0.1], rubber); }
    if (a.accessories === 'goggles') { const glass = s.material('#b7d2ce', { transparent: true, opacity: 0.3, depthWrite: false }); for (const x of [-0.03, 0.03]) { s.box([0.05, 0.018, 0.035], [x - 0.03, 0.019, 0.15], glass); s.ring(0.026, 0.003, [x - 0.03, 0.026, 0.15], rubber).rotation.x = Math.PI / 2; } s.rod([-0.035, 0.025, 0.15], [-0.025, 0.025, 0.15], 0.002, rubber); }
    if (a.accessories === 'points') for (let j = 0; j < 5; j++) s.rod([-0.12 + j * 0.025, 0.015, 0.13], [-0.115 + j * 0.025, 0.015, 0.18], 0.0018, steel, 0.0003);
    if (a.gauge) { s.box([0.05, 0.045, 0.04], [0.11, 0.033, -0.13], steel); s.cylinder(0.027, 0.027, 0.014, [0.11, 0.078, -0.13], steel).rotation.x = Math.PI / 2; s.label('0  2  4', 0.04, 0.026, [0.11, 0.079, -0.121]); s.rod([0.11, 0.076, -0.12], [0.119, 0.087, -0.12], 0.001, rubber); }
    return s.finish();
  },
});
