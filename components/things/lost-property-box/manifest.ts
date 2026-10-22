import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lost property box',
  summary:
    'A labelled crate or cardboard box overflowing with single gloves, a lunchbox, a jumper, one shoe and a trailing scarf. School offices and swimming pools, name tapes nobody sewed in, small losses, the things nobody came back for.',
  scales: ['room', 'tabletop', 'street'],
});
