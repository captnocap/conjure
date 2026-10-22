import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Donated wedding dress',
  summary:
    'A secondhand wedding dress hanging on a stand inside a clear plastic garment bag, the handwritten donation tag still tied to the hanger. Thrift stores, attics, a marriage that ended or never began, hope kept in plastic, the most expensive thing someone ever gave away.',
  scales: ['room', 'tabletop', 'street'],
});
