import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Autopsy table',
  summary:
    'A stainless pedestal examination table with a raised rim, a drain, a hose and a block headrest, scrubbed bare, laid with instruments or holding a draped form. Pathology, forensic calm, detective noir, anatomy lessons, the last careful attention anyone is given.',
  scales: ['room', 'street', 'tabletop'],
});
