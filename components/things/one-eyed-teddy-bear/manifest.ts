import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'One-eyed teddy bear',
  summary:
    'A threadbare plush bear sitting slumped, one button eye gone and a clumsy stitched repair somewhere on him. Comfort, loyalty, bedtime, hospital visits, hand-me-downs, grief, the thing you could not throw away: something loved until it came to pieces.',
  scales: ['tabletop', 'room', 'street'],
});
