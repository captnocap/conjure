import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Physicist with ear defenders',
  summary:
    'A person in a lab coat and ear defenders, holding a clipboard, laptop, coffee or multimeter, leaning in to look, pointing, crouching or standing with arms crossed. Labs, workshops, big noisy machines, the curiosity of a working scientist, safety briefings, someone who knows exactly how it works and is still a bit delighted.',
  scales: ['room', 'street', 'tabletop'],
});
