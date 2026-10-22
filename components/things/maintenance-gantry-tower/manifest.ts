import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Maintenance gantry tower',
  summary:
    'A wheeled scaffold tower with zigzag stairs, a swing-out work platform, drooping cables and a clipboard on the rail. Hangars, shipyards and film sets; night-shift mechanics, work half finished, whatever someone left up there when the siren went.',
  scales: ['street', 'room'],
});
