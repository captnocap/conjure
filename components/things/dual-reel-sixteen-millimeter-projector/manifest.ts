import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sixteen millimeter projector',
  summary: 'A portable film projector with two open-spoked reels, threaded celluloid, a focus lens and a ventilated lamp house. School screenings, home movies, travelling cinema and a machine coaxed back into life.',
  scales: ['room', 'tabletop', 'street'],
});
