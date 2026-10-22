import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hand-crank sewing machine',
  summary:
    'A table-top sewing machine in black enamel and gold decals, with a hand wheel, a crank and cloth caught under the needle. Inheritance, piecework, women\'s labour, a grandmother\'s front room, a garment stopped mid-seam and never taken up again.',
  scales: ['tabletop', 'room', 'macro'],
});
