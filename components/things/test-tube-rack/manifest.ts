import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Test-tube rack',
  summary:
    'A wooden rack holding a row of glass test tubes filled in a graded series of colours, with one tube missing, cracked or fallen. Method and patience, samples waiting to be read, a titration half done, a pH rainbow, forensic evidence, the tidy middle of an experiment.',
  scales: ['tabletop', 'macro', 'room'],
});
