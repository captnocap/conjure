import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Laser retroreflector array',
  summary:
    'A tilted tray of glass corner-cube prisms on a low stand, aimed at a distant home so that a laser fired from there comes straight back. Lonely, exact science left running for centuries with no power and no moving parts: patience, measurement, a mirror that still answers when called.',
  scales: ['tabletop', 'street', 'landscape', 'planetary', 'room'],
});
