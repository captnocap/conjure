import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiting-room chair bank',
  summary:
    'A linked bank of wipe-clean upholstered chairs on a steel beam with a small laminate corner table fused in, in institutional teal, mauve or beige, and whatever was left on it: a folded coat, a teddy, a bag of someone\'s clothes. Hospitals, clinics, departure halls and council offices; long waits, bad news, sleeping upright, strangers sitting one seat apart.',
  scales: ['room', 'street', 'tabletop'],
});
