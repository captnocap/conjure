import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jumper wire bodge',
  summary:
    'A hand-soldered bodge wire arcing between two pads on a circuit board, tacked down with a blob of hot glue or a strip of amber kapton tape. An improvised overpass on a circuit-board street. Fixes made at 3am, a cut trace, a design mistake corrected by hand, a repairer\'s fingerprints, things made to work anyway.',
  scales: ['macro', 'tabletop'],
});
