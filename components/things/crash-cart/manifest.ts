import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Crash cart',
  summary:
    'A red drawered resuscitation trolley with a defibrillator on top, an oxygen cylinder on the side and a tamper seal across the drawers. Sealed and ready in a quiet corridor, or drawers yanked open and wrappers scattered after a code; urgency, cardiac arrest, the minutes that decide everything, and the aftermath.',
  scales: ['room', 'tabletop', 'street'],
});
