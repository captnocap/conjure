import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Coin cell battery',
  summary:
    'A CR2032 lithium coin cell, engraved face up, in a sprung metal holder on a scrap of circuit board, sometimes corroded, half ejected or missing. A domed arena on a circuit-board skyline. The battery that keeps the clock alive when everything else is off: memory, forgetting, settings lost, time resetting to zero.',
  scales: ['macro', 'tabletop'],
});
