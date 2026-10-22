import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Old hardware store',
  summary:
    'A narrow century-old hardware store: creaking plank floor, shelving and drawers to a pressed-tin ceiling, a rolling ladder, a long wooden counter, dusty window light and hanging shop lamps. Competence, fathers and grandfathers, fixing rather than replacing, the smell of oil, rope and freshly cut keys.',
  scales: ['room', 'street'],
});
