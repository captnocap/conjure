import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Radiation suit locker',
  summary:
    'An open steel locker holding a hanging protective suit, a respirator, rubber boots, dosimeter badges and a hand-held radiation meter. Ready and neat, hastily stripped onto the floor, sealed off as contaminated, or empty because someone is out there wearing it. Hazard, duty, courage, invisible danger, the ones who went in.',
  scales: ['room', 'street', 'tabletop'],
});
