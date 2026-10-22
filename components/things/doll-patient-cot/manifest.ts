import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Doll patient cot',
  summary:
    'A miniature iron hospital cot holding a bandaged doll or toy tucked under a tiny blanket, with an admission tag tied to the rail. Doll hospitals, childhood illness, being looked after, a toy waiting to be collected by someone who may not come.',
  scales: ['tabletop', 'room', 'macro', 'street'],
});
