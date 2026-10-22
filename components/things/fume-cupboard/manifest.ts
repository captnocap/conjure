import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fume cupboard',
  summary:
    'A glass-sashed ventilated laboratory cabinet on a base unit, with something bubbling, stored or forgotten behind the glass. School chemistry, hazard and caution, an experiment nobody is watching, a faint glow in an empty lab, the thing you were told not to open.',
  scales: ['room', 'street'],
});
