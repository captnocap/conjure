import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Last-day rolling chalkboard',
  summary:
    'A double-sided green or black school chalkboard on a castor frame, with a chalk tray, a felt eraser and half-wiped writing still showing. The last lesson before the holidays, a countdown, a goodbye nobody rubbed out, chalk dust hanging in an empty classroom.',
  scales: ['room', 'street', 'tabletop'],
});
