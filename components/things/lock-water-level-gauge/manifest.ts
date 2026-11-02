import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: 'Canal lock water-level gauge',
  summary: 'A tall enamel water-level staff and mechanical float indicator on a waterside mounting, with marked safe levels and a small tide box. Lock-keeping, flood warnings and the slow measurement of water.',
  scales: [
    'street',
    'room',
    'landscape'
  ]
});
