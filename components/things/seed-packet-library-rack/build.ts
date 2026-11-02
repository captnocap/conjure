import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    structure: choice('What shape is the seed library display?', { steps: 'Four shallow stepped tiers for browsing.', carousel: 'A four-sided rotating rack on a central stand.', wall: 'A tall sloping wall of labelled pockets.', counter: 'A low countertop tray with three compartments.' }),
    collection: choice('Which seed collection is displayed?', { vegetables: 'Vegetable packets with beans, squash and tomato pictures.', wildflowers: 'Meadow flowers in illustrated envelopes.', heirlooms: 'Plain handwritten heirloom packets in many sizes.', trees: 'Tree seeds in tall kraft paper packets.' }),
    stock: score('How well stocked is the rack?', ['Almost empty after a busy exchange', 'Several packets in each pocket', 'Every pocket filled generously']),
    state: choice('What is happening at the library?', { opening: 'Neatly restocked for the first day of spring.', swap: 'A seed swap is in progress with donation envelopes stacked beside it.', empty: 'The most popular varieties have gone, leaving empty central pockets.', closed: 'A small closed notice hangs across the display.' }),
    timber: choice('How was the rack made?', { ply: 'Simple pale plywood with exposed edges.', reclaimed: 'Dark reclaimed boards and uneven battens.', painted: 'A soft green community-garden display.', wire: 'Thin dark metal dividers and warm wooden shelves.' }),
    header: choice('What does the header invite?', { borrow: 'BORROW / GROW / RETURN', share: 'TAKE A SEED, LEAVE A SEED', local: 'LOCAL SEED LIBRARY', future: 'SAVE SOMETHING FOR SPRING' }),
    basket: noul('Is a small return basket beside the rack?'),
    instructions: noul('Is a folded instruction leaflet standing in the front?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random } = context;
    const wood = s.material({ ply: '#cbb38c', reclaimed: '#82664e', painted: '#759078', wire: '#4c5450' }[a.timber]);
    const paper = s.material('#e5d7b3');
    const rows = a.structure === 'counter' ? 1 : 4, cols = 3, w = 0.78, ch = a.structure === 'wall' ? 0.23 : 0.15;
    const lift = a.structure === 'carousel' ? 0.52 : 0;
    if (lift) { s.cylinder(0.28, 0.32, 0.045, [0, 0.023, 0], wood); s.cylinder(0.035, 0.045, lift, [0, lift / 2, 0], wood); }
    const faces = a.structure === 'carousel' ? 4 : 1;
    for (let face = 0; face < faces; face++) {
      const theta = face * Math.PI / 2;
      const local = (x: number, y: number, z: number): [number, number, number] => [x * Math.cos(theta) + z * Math.sin(theta), y + lift, z * Math.cos(theta) - x * Math.sin(theta)];
      if (a.structure === 'carousel') {
        const back = s.box([w, rows * ch + 0.18, 0.025], local(0, rows * ch / 2 + 0.08, 0.28), wood); back.rotation.y = theta;
      }
      for (let row = 0; row < rows; row++) {
        const y = 0.035 + row * ch, z = a.structure === 'carousel' ? 0.38 : (rows - 1 - row) * (a.structure === 'wall' ? 0.035 : 0.13) - 0.15;
        const shelf = s.box([w, 0.025, 0.18], local(0, y, z), wood); shelf.rotation.y = theta;
        const lip = s.box([w, 0.09, 0.018], local(0, y + 0.04, z + 0.087), wood); lip.rotation.y = theta;
        for (let col = 0; col < cols; col++) {
          const x = (col - 1) * w / 3;
          const partition = s.box([0.014, 0.19, 0.18], local(x - w / 6, y + 0.09, z), wood); partition.rotation.y = theta;
          const missing = a.state === 'empty' && col === 1, count = missing ? 0 : Math.round(1 + a.stock * 5);
          for (let k = 0; k < count; k++) {
            const py = y + 0.14 + random() * 0.016, pz = z - 0.045 + k * 0.023, width = a.collection === 'heirlooms' ? 0.14 + random() * 0.045 : 0.19;
            const envelope = s.box([width, 0.23, 0.008], local(x + (random() - 0.5) * 0.018, py, pz), paper); envelope.rotation.y = theta; envelope.rotation.z = (random() - 0.5) * 0.05;
            if (k !== count - 1) continue;
            const crop = a.collection === 'vegetables' ? ['BEANS', 'SQUASH', 'TOMATO'][col] : a.collection === 'wildflowers' ? ['POPPY', 'ASTER', 'LUPINE'][col] : a.collection === 'trees' ? ['OAK', 'PINE', 'BIRCH'][col] : ['LOCAL 08', 'SAVED 21', 'FAMILY'][col];
            const label = s.label(crop, width * 0.9, 0.04, local(x, py + 0.065, pz + 0.006), '#454c38', '#e5d7b3'); label.rotation.y = theta;
            const ink = s.material(a.collection === 'wildflowers' ? ['#c1765e', '#b596b8', '#6c83a0'][col] : '#6b8754');
            if (a.collection !== 'heirlooms') {
              const symbol = s.ball([0.045, a.collection === 'trees' ? 0.065 : 0.038, 0.004], local(x, py - 0.015, pz + 0.009), ink, a.collection === 'trees' ? 6 : 10); symbol.rotation.y = theta;
              const stem = s.rod(local(x, py - 0.07, pz + 0.012), local(x, py + 0.02, pz + 0.012), 0.003, ink); void stem;
            }
          }
        }
      }
      const backZ = a.structure === 'carousel' ? 0.28 : -0.19;
      for (const x of [-w / 2, w / 2]) s.rod(local(x, 0.02, backZ), local(x, rows * ch + 0.22, backZ), 0.019, wood);
      const titleBoard = s.box([w, 0.15, 0.025], local(0, rows * ch + 0.21, backZ), wood); titleBoard.rotation.y = theta;
      const header = s.label({ borrow: 'BORROW / GROW / RETURN', share: 'TAKE A SEED', local: 'LOCAL SEED LIBRARY', future: 'SAVE FOR SPRING' }[a.header], w, 0.13, local(0, rows * ch + 0.21, backZ + 0.015)); header.rotation.y = theta;
    }
    if (a.state === 'closed') s.label('BACK IN SPRING', 0.4, 0.085, [0, lift + 0.25, 0.4]).rotation.z = -0.08;
    if (a.basket || a.state === 'swap') {
      const x = w / 2 + 0.19;
      s.box([0.25, 0.025, 0.3], [x, 0.012, 0.12], wood);
      for (let j = 0; j < 4; j++) for (const z of [-0.02, 0.26]) s.box([0.26, 0.018, 0.015], [x, 0.04 + j * 0.028, z], wood);
      for (const dx of [-0.12, 0.12]) s.box([0.015, 0.14, 0.3], [x + dx, 0.07, 0.12], wood);
      for (let j = 0; j < 5; j++) s.box([0.17, 0.12, 0.008], [x, 0.1, 0.025 + j * 0.035], paper).rotation.x = -0.1;
    }
    if (a.instructions) s.label('SOW / SAVE / SHARE', 0.3, 0.16, [-0.22, 0.12, 0.48]).rotation.x = -0.25;
    return s.finish();
  },
});
