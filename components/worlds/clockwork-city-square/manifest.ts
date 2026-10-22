import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Clockwork city square',
  summary:
    'A plaza in a city that runs on springs: cobbles laid over turning gears, brass house-fronts with wind-up keys in their walls, a canal of dripping oil and pneumatic message tubes overhead, in copper afternoon light. Order and ritual, guilds and winding days, intricate handmade machines, toy-box steampunk, the fear of running down.',
  scales: ['street', 'room'],
});
