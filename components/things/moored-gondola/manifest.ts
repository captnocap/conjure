import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Moored gondola',
  summary:
    'A black Venetian gondola with its toothed iron ferro prow, a brocade seat and a single oar, bobbing at its mooring on green water. Romance and ritual, a crossing paid for in advance, lovers, funerals, a boatman waiting for a passenger who may not come.',
  scales: ['street', 'landscape', 'tabletop'],
});
