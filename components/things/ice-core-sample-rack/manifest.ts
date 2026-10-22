import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ice core sample rack',
  summary:
    'An open rack of labelled cylindrical ice cores, each banded with dark layers of ash and dust, one core glowing faintly from inside. Field science, evidence, patience, deep time made visible, a polar lab bench, the one sample nobody can explain.',
  scales: ['room', 'tabletop', 'street', 'landscape', 'planetary'],
});
