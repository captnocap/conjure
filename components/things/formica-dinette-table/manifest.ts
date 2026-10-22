import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Formica dinette table',
  summary:
    'A chrome-legged kitchen dinette with a boomerang-pattern laminate top, an oilcloth and two vinyl chairs, set for one, crowded for a feast or cleared down to a single cup. Where everything was discussed: homework, bills, engagements, diagnoses, Sunday lunch, the 1950s that never left.',
  scales: ['room', 'tabletop'],
});
